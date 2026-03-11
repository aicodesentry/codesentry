import grpc
from concurrent import futures
import time
import os
from dotenv import load_dotenv

# Import the generated gRPC files
from grpc_generated import mcp_pb2
from grpc_generated import mcp_pb2_grpc

class McpServiceServicer(mcp_pb2_grpc.McpServiceServicer):
    def GetAnalysisContext(self, request, context):
        """
        Placeholder implementation for GetAnalysisContext.
        In the future, this is where we'll have the logic to
        fetch diffs, find related files, and build the context.
        """
        print(f"Received GetAnalysisContext request for PR: {request.pull_request_url}")
        
        response = mcp_pb2.AnalysisContextResponse(
            message=f"Context for {request.pull_request_url} would be processed here."
        )
        return response

def serve():
    """
    Starts the gRPC server for the MCP Service.
    """
    load_dotenv()

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Add the service to the server
    mcp_pb2_grpc.add_McpServiceServicer_to_server(McpServiceServicer(), server)

    port = os.getenv("PORT", "8002")
    server.add_insecure_port(f"[::]:{port}")

    print(f"✅ MCP Service started and listening on port {port}")
    server.start()
    
    try:
        # Keep the server running
        server.wait_for_termination()
    except KeyboardInterrupt:
        print("🛑 Shutting down MCP Service.")
        server.stop(0)

if __name__ == "__main__":
    serve()

