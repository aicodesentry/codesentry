#!/usr/bin/env python3
import os

def fix_import(file_path):
    try:
        with open(file_path, 'r') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"Warning: {file_path} not found, skipping import fix.")
        return

    new_lines = []
    fixed = False
    for line in lines:
        if line.strip() == "import mcp_pb2 as mcp__pb2":
            new_lines.append("from . import mcp_pb2 as mcp__pb2\n")
            fixed = True
        elif line.strip() == "import analysis_pb2 as analysis__pb2":
            new_lines.append("from . import analysis_pb2 as analysis__pb2\n")
            fixed = True
        elif line.strip() == "import github_pb2 as github__pb2":
            new_lines.append("from . import github_pb2 as github__pb2\n")
            fixed = True
        else:
            new_lines.append(line)
    
    if fixed:
        with open(file_path, 'w') as f:
            f.writelines(new_lines)
        print(f"✅ Fixed import in {file_path}")

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    generated_dir = os.path.join(script_dir, 'src', 'grpc_generated')

    fix_import(os.path.join(generated_dir, 'mcp_pb2_grpc.py'))
    fix_import(os.path.join(generated_dir, 'analysis_pb2_grpc.py'))
    fix_import(os.path.join(generated_dir, 'github_pb2_grpc.py'))

