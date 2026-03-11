from fastapi import APIRouter, HTTPException
from models.analysis_models import AnalysisRequest, AnalysisResult, Vulnerability, StyleIssue, StyleIssueType
from services.vertex_ai_service import vertex_ai_service
from services.analysis_cache import analysis_cache
from services.vulnerability_detector import vulnerability_detector
from services.style_analyzer import style_analyzer
from config.database import get_database
from datetime import datetime
import os
import uuid

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

@router.post("/analyze", response_model=AnalysisResult)
async def analyze_code(request: AnalysisRequest):
    """
    SCRUM-87: Analyze code for security vulnerabilities
    Sprint 3: Added style analysis
    
    This endpoint:
    1. Receives code to analyze
    2. Calls Vertex AI for vulnerability detection (SCRUM-87)
    3. Classifies vulnerabilities (SCRUM-97)
    4. Scores severity (SCRUM-99)
    5. Analyzes code style (Sprint 3)
    6. Stores results in Redis (ephemeral) and optionally MongoDB
    7. Returns combined analysis results
    """
    
    try:
        # Step 1: Security Analysis (SCRUM-87, 97, 99)
        ai_response = await vertex_ai_service.analyze_code_for_vulnerabilities(
            code=request.code,
            language=request.language
        )
        
        raw_vulns = ai_response.get("vulnerabilities", [])
        classified_vulns = vulnerability_detector.classify_vulnerabilities(raw_vulns)
        severity_counts = vulnerability_detector.count_by_severity(classified_vulns)
        
        # Step 2: Style Analysis (Sprint 3)
        style_results = None
        total_style_issues = 0
        style_issues_list = []
        style_categories = {}
        
        if request.include_style_analysis and request.language == "python":
            style_results = style_analyzer.analyze_style(request.code, request.file_path or "temp.py")
            total_style_issues = style_results.get("total_issues", 0)
            style_categories = style_results.get("categories", {})
            
            # Convert style issues to StyleIssue models
            for issue in style_results.get("issues", []):
                # Map style issue type to enum
                issue_type_map = {
                    "style_violation": StyleIssueType.PEP8_VIOLATION,
                    "code_quality": StyleIssueType.CODE_QUALITY,
                    "naming_convention": StyleIssueType.NAMING_CONVENTION,
                    "complexity": StyleIssueType.CODE_COMPLEXITY,
                }
                
                style_issue = StyleIssue(
                    type=issue_type_map.get(issue["type"], StyleIssueType.CODE_QUALITY),
                    category=issue["category"],
                    severity=issue["severity"],
                    line=issue["line"],
                    column=issue.get("column", 0),
                    code=issue["code"],
                    message=issue["message"],
                    recommendation=issue["recommendation"]
                )
                style_issues_list.append(style_issue)
        
        # Step 3: Create combined analysis result
        analysis_id = str(uuid.uuid4())
        result = AnalysisResult(
            analysis_id=analysis_id,
            timestamp=datetime.utcnow(),
            
            # Security results
            vulnerabilities=classified_vulns,
            total_vulnerabilities=len(classified_vulns),
            critical_count=severity_counts["critical"],
            high_count=severity_counts["high"],
            medium_count=severity_counts["medium"],
            low_count=severity_counts["low"],
            
            # Style results
            style_issues=style_issues_list,
            total_style_issues=total_style_issues,
            style_categories=style_categories,
            
            status="completed",
            language=request.language
        )
        
        # Step 4: Store in Redis (ephemeral) and optionally MongoDB (skip for playground)
        if request.repository != 'playground':
            analysis_record = {
                "analysis_id": analysis_id,
                "timestamp": result.timestamp.isoformat(),
                "repository": request.repository,
                "pr_number": request.pr_number,
                "file_path": request.file_path,
                "language": request.language,
                "status": result.status,
                # Security data
                "vulnerabilities": [v.model_dump() for v in classified_vulns],
                "severity_counts": severity_counts,
                "total_vulnerabilities": len(classified_vulns),
                # Style data
                "style_issues": [s.model_dump() for s in style_issues_list],
                "style_categories": style_categories,
                "total_style_issues": total_style_issues,
            }

            if analysis_cache.enabled:
                analysis_cache.store_analysis(analysis_record)

            store_in_mongo = os.getenv("ANALYSIS_STORE_IN_MONGO", "true").lower() == "true"
            if store_in_mongo:
                try:
                    db = get_database()
                except Exception:
                    db = None

                if db:
                    await db.analyses.insert_one({
                        "analysis_id": analysis_id,
                        "timestamp": datetime.utcnow(),
                        "repository": request.repository,
                        "pr_number": request.pr_number,
                        "file_path": request.file_path,
                        "language": request.language,

                        # Security data
                        "vulnerabilities": [v.model_dump() for v in classified_vulns],
                        "severity_counts": severity_counts,
                        "total_vulnerabilities": len(classified_vulns),

                        # Style data
                        "style_issues": [s.model_dump() for s in style_issues_list],
                        "style_categories": style_categories,
                        "total_style_issues": total_style_issues,
                    })

        return result

    except Exception as e:
        # Log the full error for debugging
        import traceback
        print(f"❌ ANALYSIS ERROR: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/history")
async def get_analysis_history(limit: int = 10):
    """
    SCRUM-89: Get analysis history
    """
    if analysis_cache.enabled:
        cached = analysis_cache.get_history(limit=limit)
        if cached:
            return {"analyses": cached, "total": len(cached)}

    try:
        db = get_database()
    except Exception:
        db = None

    if not db:
        return {"analyses": [], "total": 0}

    cursor = db.analyses.find().sort("timestamp", -1).limit(limit)
    analyses = await cursor.to_list(length=limit)

    for analysis in analyses:
        analysis["_id"] = str(analysis["_id"])

    return {"analyses": analyses, "total": len(analyses)}

@router.get("/pr/{pr_number}")
async def get_pr_analysis(pr_number: int, repository: str):
    """
    Get analysis results for a specific PR from MongoDB
    Returns vulnerabilities and style issues

    Query parameters:
    - repository: Full repository name (e.g., "owner/repo")
    - pr_number: PR number
    """
    try:
        analyses = []
        if analysis_cache.enabled:
            analyses = analysis_cache.get_pr_analyses(repository, pr_number)

        if not analyses:
            try:
                db = get_database()
            except Exception:
                db = None

            if db:
                cursor = db.analyses.find({
                    "repository": repository,
                    "pr_number": pr_number
                }).sort("timestamp", -1)
                analyses = await cursor.to_list(length=100)

        if not analyses:
            raise HTTPException(status_code=404, detail="No analysis found for this PR")

        # Aggregate all vulnerabilities and style issues from all files
        all_vulnerabilities = []
        all_style_issues = []
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        style_categories = {"pep8": 0, "pylint": 0, "naming": 0, "complexity": 0}

        for analysis in analyses:
            # Add vulnerabilities
            vulns = analysis.get("vulnerabilities", [])
            for vuln in vulns:
                # Add file path to each vulnerability
                vuln["file_path"] = analysis.get("file_path", "unknown")
                all_vulnerabilities.append(vuln)

                # Count by severity
                severity = vuln.get("severity", "low")
                if severity in severity_counts:
                    severity_counts[severity] += 1

            # Add style issues
            style_issues = analysis.get("style_issues", [])
            for issue in style_issues:
                # Add file path to each style issue
                issue["file_path"] = analysis.get("file_path", "unknown")
                all_style_issues.append(issue)

            # Aggregate style categories
            categories = analysis.get("style_categories", {})
            for cat, count in categories.items():
                if cat in style_categories:
                    style_categories[cat] += count

        return {
            "repository": repository,
            "pr_number": pr_number,
            "vulnerabilities": all_vulnerabilities,
            "style_issues": all_style_issues,
            "total_vulnerabilities": len(all_vulnerabilities),
            "total_style_issues": len(all_style_issues),
            "severity_counts": severity_counts,
            "style_categories": style_categories,
            "files_analyzed": len(analyses)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch analysis: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check for analysis service"""
    return {
        "status": "ok",
        "service": "analysis-service",
        "features": {
            "security": ["SCRUM-87", "SCRUM-97", "SCRUM-99"],
            "style": ["Sprint-3-Style-Analysis"]
        }
    }
