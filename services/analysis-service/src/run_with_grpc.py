import os

import uvicorn

from analysis_grpc_server import create_server


def main() -> None:
    grpc_port = int(os.getenv("ANALYSIS_GRPC_PORT", "50052"))
    grpc_server = create_server()
    grpc_server.add_insecure_port(f"[::]:{grpc_port}")
    grpc_server.start()
    print(f"Analysis gRPC service listening on {grpc_port}")

    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=int(os.getenv("PORT", "8001")),
            reload=os.getenv("UVICORN_RELOAD", "false").lower() == "true",
        )
    finally:
        grpc_server.stop(0)


if __name__ == "__main__":
    main()
