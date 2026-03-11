import grpc
import sys
import os

# Add the path to the generated gRPC files
sys.path.append(os.path.abspath('services/analysis-service/src'))

from grpc_generated import analysis_pb2
from grpc_generated import analysis_pb2_grpc

def run():
    print("Connecting to analysis-service at localhost:50051...")
    try:
        with grpc.insecure_channel('localhost:50051') as channel:
            # Wait for the channel to be ready
            grpc.channel_ready_future(channel).result(timeout=10)
            print("Channel is ready.")

            stub = analysis_pb2_grpc.AnalysisServiceStub(channel)
            
            # Construct the request correctly according to analysis.proto
            code_file = analysis_pb2.CodeFile(
                filename="test.py",
                content="print('hello world')",
                language="python",
                file_path="test.py"
            )
            
            request = analysis_pb2.AnalyzeRequest(
                pull_request_id="123",
                repository_id="test-repo",
                files=[code_file],
                config=analysis_pb2.AnalysisConfig(
                    enable_security_scan=True,
                    enable_performance_scan=True,
                    enable_style_check=True,
                    enable_best_practices=True,
                    severity_threshold="low"
                )
            )
            
            print("Sending AnalyzeCode request...")
            # Note: The actual analysis logic in the server is what we need to check
            # This request will fail because the server's AnalyzeCode expects different fields.
            # We need to see the logs.
            response = stub.AnalyzeCode(request)
            print("Received response from analysis-service.")
            print(f"Analysis ID: {response.analysis_id}")
            print(f"Status: {response.status}")

    except grpc.FutureTimeoutError:
        print("Error: Connection to analysis-service timed out.")
    except grpc.RpcError as e:
        print(f"Error calling analysis-service: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == '__main__':
    run()
