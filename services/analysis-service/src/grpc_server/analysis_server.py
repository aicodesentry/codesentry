import grpc
from concurrent import futures
import sys
import os
import time
from datetime import datetime
import threading

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from grpc_generated import analysis_pb2, analysis_pb2_grpc
from services.vertex_ai_service import vertex_ai_service
from services.vulnerability_detector import vulnerability_detector
from services.style_analyzer import style_analyzer
from config.database import get_database
from grpc_client import mcp_client
import uuid
import asyncio


class AnalysisServicer(analysis_pb2_grpc.AnalysisServiceServicer):
    """gRPC service implementation for code analysis"""

    def __init__(self):
        """Initialize with a dedicated event loop for async operations"""
        self.loop = asyncio.new_event_loop()
        self._loop_thread = threading.Thread(target=self._run_loop, daemon=True)
        self._loop_thread.start()

    def _run_loop(self):
        asyncio.set_event_loop(self.loop)
        self.loop.run_forever()

    def AnalyzeCode(self, request, context):
        """Analyze code for vulnerabilities and style issues"""
        try:
            if not self.loop.is_running():
                raise RuntimeError("Async event loop is not running")
            # Run async analysis in the shared event loop
            result = asyncio.run_coroutine_threadsafe(
                self._analyze_code_async(request),
                self.loop
            ).result()
            return result
        except Exception as e:
            print(f"Error during AnalyzeCode: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Analysis failed: {str(e)}")
            return analysis_pb2.AnalysisResponse()

    async def _analyze_code_async(self, request):
        """Async implementation of code analysis, corrected to use the 'files' field."""
        
        if not request.files:
            return analysis_pb2.AnalysisResponse(status="failed", error_message="No files to analyze.")

        # For now, we will just process the first file.
        # In the future, this should loop through all files.
        file_to_analyze = request.files[0]
        
        # Call the MCP service to get context
        print("Fetching context from MCP Service...")
        mcp_context = mcp_client.get_analysis_context(
            pull_request_url=f"https://github.com/{request.repository_id}/pull/{request.pull_request_id}",
            repository_id=request.repository_id,
            commit_id="dummy_commit_id" # This should be passed in the request in the future
        )

        if mcp_context:
            print(f"✅ Successfully received context from MCP service: {mcp_context.message}")
        else:
            print("❌ Failed to get context from MCP service.")

        # Step 1: Security Analysis
        print("Performing security analysis...")
        ai_response = await vertex_ai_service.analyze_code_for_vulnerabilities(
            code=file_to_analyze.content,
            language=file_to_analyze.language
        )

        raw_vulns = ai_response.get("vulnerabilities", [])
        classified_vulns = vulnerability_detector.classify_vulnerabilities(raw_vulns)
        severity_counts = vulnerability_detector.count_by_severity(classified_vulns)
        print(f"Found {len(classified_vulns)} vulnerabilities.")

        # Step 2: Convert vulnerabilities to proto messages
        vulnerabilities_list = []
        for vuln in classified_vulns:
            vulnerability = analysis_pb2.Vulnerability(
                type=vuln.type.value,
                severity=vuln.severity.value,
                line_number=vuln.line_number,
                code_snippet=vuln.code_snippet,
                description=vuln.description,
                recommendation=vuln.recommendation,
                confidence=vuln.confidence
            )
            vulnerabilities_list.append(vulnerability)

        # Step 3: Create response
        analysis_id = str(uuid.uuid4())
        db = get_database()
        
        result_payload = {
            "analysis_id": analysis_id,
            "timestamp": datetime.utcnow(),
            "repository_id": request.repository_id,
            "pull_request_id": request.pull_request_id,
            "file_path": file_to_analyze.file_path,
            "language": file_to_analyze.language,
            "vulnerabilities": [v.model_dump() for v in classified_vulns],
            "severity_counts": severity_counts,
            "total_vulnerabilities": len(classified_vulns),
        }

        await db.analyses.insert_one(result_payload)
        print(f"✅ Analysis results stored in DB for {analysis_id}")

        return analysis_pb2.AnalysisResponse(
            analysis_id=analysis_id,
            timestamp=int(result_payload["timestamp"].timestamp()),
            # This is a simplified response for now
            status="completed"
        )

    def GetAnalysis(self, request, context):
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details('Method not implemented!')
        raise NotImplementedError('Method not implemented!')

    def BatchAnalyze(self, request, context):
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details('Method not implemented!')
        raise NotImplementedError('Method not implemented!')

    def HealthCheck(self, request, context):
        """Health check endpoint"""
        return analysis_pb2.HealthResponse(
            status="healthy",
            version="1.0.0",
            timestamp=int(time.time())
        )

def serve():
    """Start gRPC server"""
    print("!!! SERVING gRPC SERVER FROM analysis_server.py (Corrected Version) !!!")
    
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    analysis_pb2_grpc.add_AnalysisServiceServicer_to_server(AnalysisServicer(), server)
    
    port = os.getenv('GRPC_PORT', '50051')
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    print(f"[gRPC] Analysis service started on port {port}")
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
