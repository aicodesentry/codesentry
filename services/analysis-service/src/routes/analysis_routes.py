from fastapi import APIRouter, HTTPException
from models.analysis_models import AnalysisRequest, AnalysisResult, Vulnerability, StyleIssue, StyleIssueType
from services.vertex_ai_service import vertex_ai_service
from services.analysis_cache import analysis_cache
from services.vulnerability_detector import vulnerability_detector
from services.style_analyzer import style_analyzer
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

@router.post("/analyze", response_model=AnalysisResult)
async def analyze_code(request: AnalysisRequest):
    """
    Analyze code for security vulnerabilities and style issues.
    Results are cached in Redis and returned to the caller.
    Persistent storage is handled by the api-service orchestrator (PostgreSQL).
    """

    try:
        # Step 1: Security Analysis
        ai_response = await vertex_ai_service.analyze_code_for_vulnerabilities(
            code=request.code,
            language=request.language
        )

        raw_vulns = ai_response.get("vulnerabilities", [])
        classified_vulns = vulnerability_detector.classify_vulnerabilities(raw_vulns)
        severity_counts = vulnerability_detector.count_by_severity(classified_vulns)

        # Step 2: Style Analysis
        style_results = None
        total_style_issues = 0
        style_issues_list = []
        style_categories = {}

        if request.include_style_analysis and request.language == "python":
            style_results = style_analyzer.analyze_style(request.code, request.file_path or "temp.py")
            total_style_issues = style_results.get("total_issues", 0)
            style_categories = style_results.get("categories", {})

            for issue in style_results.get("issues", []):
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
            vulnerabilities=classified_vulns,
            total_vulnerabilities=len(classified_vulns),
            critical_count=severity_counts["critical"],
            high_count=severity_counts["high"],
            medium_count=severity_counts["medium"],
            low_count=severity_counts["low"],
            style_issues=style_issues_list,
            total_style_issues=total_style_issues,
            style_categories=style_categories,
            status="completed",
            language=request.language
        )

        # Cache in Redis (ephemeral) — skip playground requests
        if request.repository != 'playground' and analysis_cache.enabled:
            analysis_record = {
                "analysis_id": analysis_id,
                "timestamp": result.timestamp.isoformat(),
                "repository": request.repository,
                "pr_number": request.pr_number,
                "file_path": request.file_path,
                "language": request.language,
                "status": result.status,
                "vulnerabilities": [v.model_dump() for v in classified_vulns],
                "severity_counts": severity_counts,
                "total_vulnerabilities": len(classified_vulns),
                "style_issues": [s.model_dump() for s in style_issues_list],
                "style_categories": style_categories,
                "total_style_issues": total_style_issues,
            }
            analysis_cache.store_analysis(analysis_record)

        return result

    except Exception as e:
        import traceback
        print(f"ANALYSIS ERROR: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/history")
async def get_analysis_history(limit: int = 10):
    """Get analysis history from cache."""
    if analysis_cache.enabled:
        cached = analysis_cache.get_history(limit=limit)
        if cached:
            return {"analyses": cached, "total": len(cached)}
    return {"analyses": [], "total": 0}

@router.get("/health")
async def health_check():
    """Health check for analysis service"""
    return {
        "status": "ok",
        "service": "analysis-service",
    }
