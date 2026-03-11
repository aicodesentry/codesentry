import grpc
import os
from dotenv import load_dotenv

# Make sure the grpc_generated files are importable
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from grpc_generated import mcp_pb2
from grpc_generated import mcp_pb2_grpc

load_dotenv()

# The hostname 'mcp-service' is defined in docker-compose.yml
MCP_SERVICE_URL = os.getenv("MCP_SERVICE_URL", "mcp-service:8002")

def get_analysis_context(pull_request_url, repository_id, commit_id):
    """
    Client function to call the McpService's GetAnalysisContext method.
    """
    try:
        with grpc.insecure_channel(MCP_SERVICE_URL) as channel:
            stub = mcp_pb2_grpc.McpServiceStub(channel)
            request = mcp_pb2.GetAnalysisContextRequest(
                pull_request_url=pull_request_url,
                repository_id=str(repository_id), # Ensure it's a string
                commit_id=commit_id
            )
            print(f"Sending request to MCP Service for PR: {pull_request_url}")
            response = stub.GetAnalysisContext(request)
            print(f"Received response from MCP Service: {response.message}")
            return response
    except grpc.RpcError as e:
        print(f"Error calling MCP Service at {MCP_SERVICE_URL}: {e.status()}: {e.details()}")
        return None
