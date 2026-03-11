from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum

class VulnerabilityType(str, Enum):
    """SCRUM-97: Vulnerability Classification"""
    SQL_INJECTION = "sql_injection"
    XSS = "cross_site_scripting"
    COMMAND_INJECTION = "command_injection"
    AUTH_BYPASS = "authentication_bypass"
    INSECURE_DESERIALIZATION = "insecure_deserialization"
    SENSITIVE_DATA_EXPOSURE = "sensitive_data_exposure"
    XXE = "xml_external_entities"
    BROKEN_ACCESS_CONTROL = "broken_access_control"
    SECURITY_MISCONFIGURATION = "security_misconfiguration"
    INJECTION = "injection"
    INSECURE_DEPENDENCIES = "insecure_dependencies"
    PATH_TRAVERSAL = "path_traversal"
    INSECURE_CRYPTOGRAPHY = "insecure_cryptography"
    RACE_CONDITION = "race_condition"
    MEMORY_SAFETY = "memory_safety"
    SECURITY_ISSUE = "security_issue"
    UNKNOWN = "unknown"

class SeverityLevel(str, Enum):
    """SCRUM-99: Severity Scoring"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class StyleIssueType(str, Enum):
    """Sprint 3: Style Issue Classification"""
    PEP8_VIOLATION = "pep8_violation"
    NAMING_CONVENTION = "naming_convention"
    CODE_COMPLEXITY = "code_complexity"
    CODE_QUALITY = "code_quality"
    LINE_LENGTH = "line_length"
    INDENTATION = "indentation"
    IMPORT_ORDER = "import_order"

class Vulnerability(BaseModel):
    """Individual vulnerability finding"""
    type: VulnerabilityType
    severity: SeverityLevel
    line_number: int
    code_snippet: str
    description: str
    recommendation: str
    confidence: float = Field(ge=0.0, le=1.0)

class StyleIssue(BaseModel):
    """Sprint 3: Individual style issue finding"""
    type: StyleIssueType
    category: str
    severity: SeverityLevel
    line: int
    column: int
    code: str
    message: str
    recommendation: str

class AnalysisRequest(BaseModel):
    """Request to analyze code"""
    code: str
    language: str = "python"
    repository: Optional[str] = None
    pr_number: Optional[int] = None
    file_path: Optional[str] = None
    include_style_analysis: bool = True  # Sprint 3: Option to include style

class AnalysisResult(BaseModel):
    """SCRUM-87: Analysis result with vulnerabilities and style issues"""
    analysis_id: str
    timestamp: datetime
    
    # Security Analysis (SCRUM-87, 97, 99)
    vulnerabilities: List[Vulnerability]
    total_vulnerabilities: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    
    # Style Analysis (Sprint 3)
    style_issues: Optional[List[StyleIssue]] = []
    total_style_issues: Optional[int] = 0
    style_categories: Optional[Dict[str, int]] = {}
    
    status: str
    language: str
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
