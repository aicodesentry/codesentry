import os
import json
import re
from typing import Dict

# Try to import Gemini API (faster than Vertex AI)
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️  Gemini API library not available. Using mock responses.")

class VertexAIService:
    """SCRUM-87: Google Gemini API Integration for Code Analysis (Direct API - faster than Vertex AI)"""

    def __init__(self):
        self.use_mock = not GEMINI_AVAILABLE
        self.model_name = "gemini-2.0-flash-exp"  # Latest fast model
        
        # Initialize Redis for caching
        import redis
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self.redis_client.ping()
            print("✅ Redis cache connected")
            self.use_cache = True
        except Exception as e:
            print(f"⚠️  Redis cache not available: {e}")
            self.use_cache = False

        if not self.use_mock:
            # Try Gemini API key first (faster, simpler)
            gemini_api_key = os.getenv("GEMINI_API_KEY")

            if gemini_api_key:
                try:
                    genai.configure(api_key=gemini_api_key)
                    print("✅ Gemini API configured (Direct API - Fast Mode)")
                    self.use_mock = False
                except Exception as e:
                    print(f"⚠️  Failed to configure Gemini API: {e}")
                    print("⚠️  Using mock responses.")
                    self.use_mock = True
            else:
                print("⚠️  GEMINI_API_KEY not set. Using mock responses.")
                print("⚠️  Get your free API key at: https://aistudio.google.com/app/apikey")
                self.use_mock = True

    def _strip_comments_and_blank_lines(self, code: str, language: str) -> str:
        """
        Remove obvious comments and blank lines to keep more real code within the length limit.
        """
        # Remove common block comment styles first
        cleaned = re.sub(r"/\\*.*?\\*/", "", code, flags=re.S)
        cleaned = re.sub(r'"""[\\s\\S]*?"""', "", cleaned)
        cleaned = re.sub(r"'''[\\s\\S]*?'''", "", cleaned)

        cleaned_lines = []
        for line in cleaned.splitlines():
            stripped_line = line.strip()

            # Skip empty lines early
            if not stripped_line:
                continue

            # Skip whole-line comments for common languages (Python, JS/TS, SQL)
            if stripped_line.startswith(("#", "//", "--")):
                continue

            # Remove trailing inline comments when they follow whitespace
            line_no_inline = re.sub(r"\\s+//.*$", "", line)
            line_no_inline = re.sub(r"\\s+#.*$", "", line_no_inline)
            line_no_inline = re.sub(r"\\s+--.*$", "", line_no_inline)

            final_line = line_no_inline.strip()
            if final_line:
                cleaned_lines.append(final_line)

        return "\\n".join(cleaned_lines)
    
    async def analyze_code_for_vulnerabilities(self, code: str, language: str = "javascript", filename: str = "unknown") -> Dict:
        """
        Analyze code using Vertex AI to detect security vulnerabilities
        SCRUM-87: Security Vulnerability Detection
        """
        
        # Check cache first
        if self.use_cache:
            import hashlib
            # Create a unique hash for this code content
            code_hash = hashlib.sha256(code.encode('utf-8')).hexdigest()
            cache_key = f"analysis:{code_hash}"
            
            try:
                cached_result = self.redis_client.get(cache_key)
                if cached_result:
                    print(f"⚡ Cache hit for {filename}")
                    return json.loads(cached_result)
            except Exception as e:
                print(f"⚠️  Cache read failed: {e}")

        # Use mock data if Google Cloud not available
        if self.use_mock:
            return self._mock_analysis(code, language)

        # Remove non-essential content before enforcing the hard limit
        cleaned_code = self._strip_comments_and_blank_lines(code, language)
        if len(cleaned_code) < len(code):
            removed_chars = len(code) - len(cleaned_code)
            print(f"ℹ️  Reduced code size by {removed_chars} characters by removing comments/blank lines")

        # Limit code size to prevent memory issues (max 100,000 characters)
        # For larger files, analyze only the first 100k characters after cleanup
        MAX_CODE_LENGTH = 100000
        if len(cleaned_code) > MAX_CODE_LENGTH:
            print(f"⚠️  Code too long after cleanup ({len(cleaned_code)} chars), analyzing first {MAX_CODE_LENGTH} characters")
            cleaned_code = cleaned_code[:MAX_CODE_LENGTH]
        
        prompt = f"""You are a security expert code reviewer. Analyze the following {language} code for security vulnerabilities.
File context: {filename}

Focus on detecting:
1. SQL Injection
2. Cross-Site Scripting (XSS)
3. Authentication/Authorization issues
4. Insecure deserialization
5. Sensitive data exposure
6. XML External Entities (XXE)
7. Broken access control
8. Security misconfiguration
9. Injection flaws
10. Insecure dependencies
11. Command Injection
12. Path Traversal
13. Insecure Cryptography
14. Race Conditions
15. Memory Safety Issues

Code to analyze:
```{language}
{cleaned_code}
```

Return ONLY a JSON array of vulnerabilities found. Each vulnerability MUST have ALL these fields:
- type: REQUIRED - Must be one of: "SQL Injection", "Cross-Site Scripting (XSS)", "Command Injection", "Authentication Bypass", "Authorization Bypass", "Insecure Deserialization", "Sensitive Data Exposure", "XML External Entity (XXE)", "Broken Access Control", "Security Misconfiguration", "Path Traversal", "Insecure Cryptography", "Race Condition", "Memory Safety", "Injection Flaw", "Insecure Dependency", or "Security Issue" (use this as fallback only if no specific type applies)
- severity: REQUIRED - Must be exactly one of: "critical", "high", "medium", "low"
- line_number: REQUIRED - Integer line number where issue occurs
- code_snippet: REQUIRED - The actual problematic code (max 200 chars)
- description: REQUIRED - Clear explanation of the security issue
- recommendation: REQUIRED - Specific actionable fix
- confidence: REQUIRED - Float between 0.0 and 1.0

CRITICAL: The "type" field must NEVER be null, empty, or generic. Always provide a specific vulnerability type from the list above.

If no vulnerabilities found, return an empty array: []

Example of correct format:
[
  {{
    "type": "SQL Injection",
    "severity": "critical",
    "line_number": 15,
    "code_snippet": "query = f\\"SELECT * FROM users WHERE id = {{user_id}}\\"",
    "description": "SQL injection vulnerability due to string formatting in database query",
    "recommendation": "Use parameterized queries: cursor.execute(\\"SELECT * FROM users WHERE id = %s\\", (user_id,))",
    "confidence": 0.95
  }}
]
"""
        
        try:
            # Use Gemini API Direct (faster than Vertex AI)
            model = genai.GenerativeModel(self.model_name)

            # Configure for JSON output with faster settings
            generation_config = {
                "temperature": 0.1,  # Lower = faster and more consistent
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 8192,
                "response_mime_type": "application/json",
            }

            response = model.generate_content(
                prompt,
                generation_config=generation_config
            )
            
            result_text = response.text.strip()

            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:].strip()

            vulnerabilities = json.loads(result_text)

            # Validate and fix missing or invalid 'type' fields
            if isinstance(vulnerabilities, list):
                for vuln in vulnerabilities:
                    if not vuln.get("type") or vuln.get("type").strip() == "":
                        # Infer type from description if possible
                        description_lower = vuln.get("description", "").lower()
                        if "sql" in description_lower and "inject" in description_lower:
                            vuln["type"] = "SQL Injection"
                        elif "xss" in description_lower or "cross-site" in description_lower or "script" in description_lower:
                            vuln["type"] = "Cross-Site Scripting (XSS)"
                        elif "command" in description_lower and "inject" in description_lower:
                            vuln["type"] = "Command Injection"
                        elif "auth" in description_lower:
                            vuln["type"] = "Authentication Bypass"
                        elif "password" in description_lower or "credential" in description_lower or "secret" in description_lower:
                            vuln["type"] = "Sensitive Data Exposure"
                        elif "path" in description_lower and "travers" in description_lower:
                            vuln["type"] = "Path Traversal"
                        elif "crypt" in description_lower:
                            vuln["type"] = "Insecure Cryptography"
                        else:
                            # Fallback to generic type
                            vuln["type"] = "Security Issue"
                        print(f"⚠️  Fixed missing type field: {vuln['type']} (inferred from description)")

            result = {
                "vulnerabilities": vulnerabilities if isinstance(vulnerabilities, list) else [],
                "raw_response": response.text
            }
            
            # Cache the result for 24 hours (86400 seconds)
            if self.use_cache:
                try:
                    self.redis_client.setex(
                        cache_key,
                        86400,
                        json.dumps(result)
                    )
                    print(f"💾 Cached result for {filename}")
                except Exception as e:
                    print(f"⚠️  Cache write failed: {e}")

            # Force garbage collection to free memory
            import gc
            gc.collect()

            return result

        except Exception as e:
            print(f"❌ Gemini API Error: {str(e)}")
            import gc
            gc.collect()
            raise e
    
    def _mock_analysis(self, code: str, language: str) -> Dict:
        """
        Mock analysis for testing without Google Cloud
        SCRUM-87: Returns sample vulnerabilities for testing
        """
        vulnerabilities = []
        
        # Detect SQL injection patterns
        if "SELECT" in code and ("+" in code or "concat" in code.lower()):
            vulnerabilities.append({
                "type": "sql_injection",
                "severity": "critical",
                "line_number": 1,
                "code_snippet": code[:100],
                "description": "Potential SQL injection vulnerability detected due to string concatenation in SQL query",
                "recommendation": "Use parameterized queries or prepared statements instead of string concatenation",
                "confidence": 0.85
            })
        
        # Detect XSS patterns
        if "innerHTML" in code or "document.write" in code:
            vulnerabilities.append({
                "type": "cross_site_scripting",
                "severity": "high",
                "line_number": 1,
                "code_snippet": code[:100],
                "description": "Potential XSS vulnerability - unsafe DOM manipulation",
                "recommendation": "Use textContent or sanitize user input before inserting into DOM",
                "confidence": 0.75
            })
        
        # Detect hardcoded credentials
        if "password" in code.lower() and ("=" in code or ":" in code):
            vulnerabilities.append({
                "type": "sensitive_data_exposure",
                "severity": "critical",
                "line_number": 1,
                "code_snippet": "***REDACTED***",
                "description": "Hardcoded credentials detected in source code",
                "recommendation": "Use environment variables or secure credential management system",
                "confidence": 0.90
            })
        
        return {
            "vulnerabilities": vulnerabilities,
            "mock": True,
            "message": "Using mock analysis - Google Cloud AI not configured"
        }

vertex_ai_service = VertexAIService()
