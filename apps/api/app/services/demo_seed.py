from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.models import (
    ActivityLog,
    Application,
    ApplicationStageHistory,
    Candidate,
    CandidateDocument,
    CandidateSkill,
    Interview,
    InterviewFeedback,
    InterviewParticipant,
    Job,
    JobRequirement,
    Notification,
    Organization,
    OrganizationMember,
    RecruiterNote,
    ResumeAnalysis,
    User,
    UserPreference,
    UserProfile,
)
from app.services.documents import generate_synthetic_pdf_bytes
from app.services.resume_ai import DeterministicRuleProvider

PUBLIC_SHOWCASE_SLUG = "alder-finch-demo"

# Precomputed once at module load so creating isolated demo sessions stays fast.
_DEMO_PASSWORD_HASH = hash_password("TalentOSDemo!2026")
_RULE_PROVIDER = DeterministicRuleProvider()

JOB_BLUEPRINTS: list[dict[str, Any]] = [
    {
        "key": "staff-frontend",
        "title": "Staff Frontend Engineer",
        "department": "Engineering",
        "employment_type": "full_time",
        "work_arrangement": "hybrid",
        "location": "Singapore / Remote APAC",
        "salary_min": 145000,
        "salary_max": 175000,
        "salary_currency": "USD",
        "status": "published",
        "openings_count": 2,
        "deadline_days": 14,
        "description": (
            "Lead the design-system architecture and core interactive workspace surfaces for our "
            "enterprise logistics platform. You will partner closely with product design and backend "
            "engineers to build accessible, high-density workflows."
        ),
        "responsibilities": [
            "Architect reusable React and TypeScript interfaces across multi-tenant workflows.",
            "Maintain WCAG 2.2 AA accessibility standards and keyboard navigation across data views.",
            "Establish frontend performance budgets and automated Playwright test coverage.",
            "Mentor senior engineers through RFC reviews and technical pairing.",
        ],
        "required_qualifications": [
            "6+ years building production TypeScript and React web applications",
            "Experience architecting Next.js App Router applications and design systems",
            "Practical experience with WCAG accessibility standards and keyboard interactions",
            "Track record owning frontend testing with Vitest or Playwright",
        ],
        "preferred_qualifications": [
            "Experience designing complex drag-and-drop workflows or data tables",
            "Familiarity with Tailwind CSS token architecture and CSS container queries",
        ],
        "required_skills": ["TypeScript", "React", "Next.js", "Tailwind CSS", "WCAG", "Playwright"],
    },
    {
        "key": "senior-backend",
        "title": "Senior Backend Engineer (Python)",
        "department": "Engineering",
        "employment_type": "full_time",
        "work_arrangement": "remote",
        "location": "Remote (UTC+5 to UTC+9)",
        "salary_min": 125000,
        "salary_max": 155000,
        "salary_currency": "USD",
        "status": "published",
        "openings_count": 2,
        "deadline_days": 21,
        "description": (
            "Design and operate reliable Python APIs, relational data pipelines, and tenant-isolated "
            "document workflows powering high-volume customer operations."
        ),
        "responsibilities": [
            "Build versioned FastAPI services backed by PostgreSQL and SQLAlchemy.",
            "Design clean Alembic migrations and optimize indexing for reporting queries.",
            "Harden authentication, RBAC boundaries, and file ingestion pipelines.",
            "Write automated pytest integration suites covering security and data isolation.",
        ],
        "required_qualifications": [
            "5+ years building backend services with Python and FastAPI or Django",
            "Strong PostgreSQL schema modeling, indexing, and SQLAlchemy experience",
            "Experience enforcing role-based access control and API security best practices",
            "Hands-on testing experience with Pytest and CI/CD pipelines",
        ],
        "preferred_qualifications": [
            "Experience with Docker, Alembic migrations, and OpenAPI documentation",
            "Exposure to document parsing pipelines or background task queues",
        ],
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "Pytest", "Docker"],
    },
    {
        "key": "product-designer",
        "title": "Senior Product Designer",
        "department": "Design",
        "employment_type": "full_time",
        "work_arrangement": "hybrid",
        "location": "Jakarta / Hybrid",
        "salary_min": 95000,
        "salary_max": 120000,
        "salary_currency": "USD",
        "status": "published",
        "openings_count": 1,
        "deadline_days": 10,
        "description": (
            "Shape clear, calm enterprise workflows for operations and planning teams. You will own "
            "research synthesis, interaction flows, and component specifications from discovery to release."
        ),
        "responsibilities": [
            "Design end-to-end user flows for scheduling, reporting, and review tools.",
            "Evolve our shared Figma component library with semantic light and dark tokens.",
            "Conduct moderated usability studies with operations managers and coordinators.",
            "Collaborate closely with frontend engineers during implementation QA.",
        ],
        "required_qualifications": [
            "4+ years designing B2B SaaS or workflow-heavy web applications in Figma",
            "Demonstrated ownership of multi-theme Design Systems and typography scales",
            "Strong foundation in User Research and accessibility contrast verification",
            "Ability to translate complex tabular data into calm, scannable layouts",
        ],
        "preferred_qualifications": [
            "Working familiarity with CSS layout mechanics and React component props",
            "Experience designing mobile-responsive enterprise review workflows",
        ],
        "required_skills": ["Figma", "Design Systems", "User Research", "WCAG", "Product Strategy"],
    },
    {
        "key": "data-analytics-eng",
        "title": "Analytics Engineer",
        "department": "Data",
        "employment_type": "full_time",
        "work_arrangement": "remote",
        "location": "Remote",
        "salary_min": 110000,
        "salary_max": 135000,
        "salary_currency": "USD",
        "status": "published",
        "openings_count": 1,
        "deadline_days": 28,
        "description": (
            "Build trustworthy metrics layers, funnel models, and operational reporting datasets "
            "using SQL, dbt, and PostgreSQL so leadership teams make decisions on documented definitions."
        ),
        "responsibilities": [
            "Model core operational events and stage transitions in SQL and dbt.",
            "Maintain documented metric definitions with automated data quality tests.",
            "Partner with product teams to design clear executive reporting views.",
            "Optimize analytical query latency across multi-organization tables.",
        ],
        "required_qualifications": [
            "3+ years of production SQL, PostgreSQL, and Data Modeling experience",
            "Hands-on experience building transformation models with dbt and Python",
            "Experience documenting business metrics for BI tools like Looker or Tableau",
        ],
        "preferred_qualifications": [
            "Experience with Airflow orchestration or BigQuery / Snowflake warehouses",
            "Familiarity with statistical funnel conversion analysis",
        ],
        "required_skills": ["SQL", "PostgreSQL", "dbt", "Python", "Data Modeling", "Looker"],
    },
    {
        "key": "appsec-engineer",
        "title": "Application Security Engineer",
        "department": "Security",
        "employment_type": "full_time",
        "work_arrangement": "hybrid",
        "location": "Singapore / Hybrid",
        "salary_min": 135000,
        "salary_max": 165000,
        "salary_currency": "USD",
        "status": "published",
        "openings_count": 1,
        "deadline_days": 18,
        "description": (
            "Partner with engineering teams to harden authentication, tenant isolation, dependency "
            "hygiene, and secure document handling across our web and API stack."
        ),
        "responsibilities": [
            "Conduct threat modeling and code reviews focused on OWASP Top 10 risks.",
            "Validate tenant data isolation, RBAC enforcement, and signed URL controls.",
            "Guide safe handling of untrusted user documents and AI prompt boundaries.",
            "Maintain automated dependency scanning in GitHub Actions.",
        ],
        "required_qualifications": [
            "4+ years in Application Security, Security Auditing, or secure engineering",
            "Deep knowledge of OWASP web vulnerabilities, OAuth 2.0, and session security",
            "Experience reviewing Python or TypeScript web applications and PostgreSQL access policies",
        ],
        "preferred_qualifications": [
            "Experience evaluating LLM prompt injection defenses and file upload sandboxing",
            "Familiarity with AWS or GCP IAM least-privilege architecture",
        ],
        "required_skills": ["Security Auditing", "OWASP", "OAuth 2.0", "Python", "PostgreSQL", "CI/CD"],
    },
    {
        "key": "product-manager",
        "title": "Senior Product Manager, Core Workflows",
        "department": "Product",
        "employment_type": "full_time",
        "work_arrangement": "hybrid",
        "location": "Jakarta / Singapore",
        "salary_min": 115000,
        "salary_max": 140000,
        "salary_currency": "USD",
        "status": "published",
        "openings_count": 1,
        "deadline_days": 25,
        "description": (
            "Own roadmap discovery, specification writing, and customer feedback loops for our "
            "collaborative planning and workflow coordination suite."
        ),
        "responsibilities": [
            "Define quarterly product priorities grounded in customer interviews and funnel telemetry.",
            "Write concise product requirements with clear acceptance criteria.",
            "Coordinate release readiness with design, engineering, and customer operations.",
            "Evaluate feature adoption and iterate based on observed workflow friction.",
        ],
        "required_qualifications": [
            "5+ years in B2B SaaS Product Strategy and cross-functional delivery",
            "Track record shipping workflow, collaboration, or analytics products",
            "Strong analytical fluency with SQL or reporting tools and Stakeholder Communication",
        ],
        "preferred_qualifications": [
            "Experience launching human-in-the-loop AI assistance features responsibly",
            "Background working with HR tech, ATS, or enterprise productivity tools",
        ],
        "required_skills": ["Product Strategy", "Stakeholder Communication", "User Research", "Agile Delivery", "SQL"],
    },
    {
        "key": "platform-devops",
        "title": "Platform Infrastructure Engineer",
        "department": "Engineering",
        "employment_type": "full_time",
        "work_arrangement": "remote",
        "location": "Remote",
        "salary_min": 130000,
        "salary_max": 160000,
        "salary_currency": "USD",
        "status": "paused",
        "openings_count": 1,
        "deadline_days": 35,
        "description": (
            "Improve deployment reliability, container builds, observability, and zero-downtime "
            "PostgreSQL operations across cloud environments."
        ),
        "responsibilities": [
            "Manage Docker, Terraform, and GitHub Actions deployment pipelines.",
            "Maintain PostgreSQL backup verification, monitoring, and failover drills.",
            "Standardize environment secret rotation and least-privilege IAM policies.",
        ],
        "required_qualifications": [
            "4+ years with Docker, Kubernetes, Terraform, and AWS or GCP",
            "Experience operating production PostgreSQL and CI/CD automation",
            "Strong Linux networking and incident response background",
        ],
        "preferred_qualifications": [
            "Experience with Python or Go tooling for internal developer platforms",
        ],
        "required_skills": ["Docker", "Kubernetes", "Terraform", "AWS", "CI/CD", "Linux"],
    },
    {
        "key": "people-ops",
        "title": "Talent Operations Specialist",
        "department": "People",
        "employment_type": "contract",
        "work_arrangement": "hybrid",
        "location": "Jakarta / Hybrid",
        "salary_min": 60000,
        "salary_max": 78000,
        "salary_currency": "USD",
        "status": "draft",
        "openings_count": 1,
        "deadline_days": 40,
        "description": (
            "Coordinate structured interview loops, maintain candidate communication standards, and "
            "audit hiring funnel hygiene across engineering and product teams."
        ),
        "responsibilities": [
            "Coordinate multi-interviewer panels across APAC and European timezones.",
            "Maintain consistent interview scorecards and timely candidate updates.",
            "Audit data retention schedules and privacy consent records.",
        ],
        "required_qualifications": [
            "3+ years in recruiting coordination, people operations, or Hiring and Interviewing",
            "Strong Stakeholder Communication and Process Improvement track record",
            "Experience managing structured ATS pipelines and candidate scheduling",
        ],
        "preferred_qualifications": [
            "Experience preparing recruiting funnel reports for hiring leaders",
        ],
        "required_skills": ["Hiring and Interviewing", "Stakeholder Communication", "Process Improvement", "Project Management"],
    },
]

# 40 clearly fictional synthetic candidates (zero real PII; @demo.example.com).
CANDIDATE_BLUEPRINTS: list[dict[str, Any]] = [
    {"name": "Nadia Kusuma", "handle": "nadia.kusuma", "loc": "Jakarta, ID", "yrs": 7, "headline": "Staff Frontend Architect | React, TypeScript & Design Systems", "skills": ["TypeScript", "React", "Next.js", "Tailwind CSS", "WCAG", "Playwright", "Design Systems", "Technical Leadership"], "degree": "B.S. Computer Science, Institut Teknologi Bandung", "company": "Northwind Logistics Tech", "primary_job": 0},
    {"name": "Arjun Mehta", "handle": "arjun.mehta", "loc": "Singapore, SG", "yrs": 6, "headline": "Senior Backend Engineer | Python, FastAPI & PostgreSQL", "skills": ["Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "Pytest", "Docker", "REST API", "Alembic"], "degree": "B.Eng. Software Engineering, National University of Singapore", "company": "Meridian Clearing Labs", "primary_job": 1},
    {"name": "Hana Watanabe", "handle": "hana.watanabe", "loc": "Tokyo, JP", "yrs": 5, "headline": "Senior Product Designer | Enterprise Systems & Accessibility", "skills": ["Figma", "Design Systems", "User Research", "WCAG", "Product Strategy", "Accessibility Advocacy"], "degree": "B.A. Interaction Design, Tama Art University", "company": "Kanso Cloud Tools", "primary_job": 2},
    {"name": "Budi Santoso", "handle": "budi.santoso", "loc": "Bandung, ID", "yrs": 5, "headline": "Analytics Engineer | SQL, dbt & Funnel Telemetry", "skills": ["SQL", "PostgreSQL", "dbt", "Python", "Data Modeling", "Looker", "Airflow"], "degree": "B.S. Statistics, Universitas Padjadjaran", "company": "Cakra Retail Analytics", "primary_job": 3},
    {"name": "Elena Rostova", "handle": "elena.rostova", "loc": "Singapore, SG", "yrs": 6, "headline": "Application Security Engineer | OWASP & Cloud Auth", "skills": ["Security Auditing", "OWASP", "OAuth 2.0", "Python", "PostgreSQL", "CI/CD", "AWS"], "degree": "M.S. Information Security, Nanyang Technological University", "company": "HarborTrust FinTech", "primary_job": 4},
    {"name": "Marcus Lim", "handle": "marcus.lim", "loc": "Kuala Lumpur, MY", "yrs": 6, "headline": "Senior Product Manager | B2B SaaS Workflows", "skills": ["Product Strategy", "Stakeholder Communication", "User Research", "Agile Delivery", "SQL", "Cross-functional Collaboration"], "degree": "B.B.A. Technology Management, Universiti Malaya", "company": "Veridian Ops Software", "primary_job": 5},
    {"name": "Rina Oktaviani", "handle": "rina.oktaviani", "loc": "Jakarta, ID", "yrs": 8, "headline": "Principal UI Engineer | Next.js & Accessible Data Tables", "skills": ["TypeScript", "React", "Next.js", "Tailwind CSS", "WCAG", "Vitest", "Playwright", "Mentoring"], "degree": "B.S. Informatics, Universitas Indonesia", "company": "Pilar Enterprise Cloud", "primary_job": 0},
    {"name": "Tomasz Zielinski", "handle": "tomasz.zielinski", "loc": "Warsaw, PL", "yrs": 7, "headline": "Backend Systems Engineer | Python, Postgres & Distributed APIs", "skills": ["Python", "FastAPI", "Django", "PostgreSQL", "SQLAlchemy", "Redis", "Docker", "Pytest"], "degree": "M.S. Computer Science, Warsaw University of Technology", "company": "Baltic Ledger Systems", "primary_job": 1},
    {"name": "Mei-Ling Tan", "handle": "meiling.tan", "loc": "Singapore, SG", "yrs": 5, "headline": "Product Designer | Workflow Clarity & Design Tokens", "skills": ["Figma", "Design Systems", "User Research", "WCAG", "Documentation", "Cross-functional Collaboration"], "degree": "B.Des. Communication Design, LASALLE College", "company": "Strata Freight Platform", "primary_job": 2},
    {"name": "Dimas Nugroho", "handle": "dimas.nugroho", "loc": "Yogyakarta, ID", "yrs": 4, "headline": "Data & Analytics Engineer | dbt, PostgreSQL & BI", "skills": ["SQL", "PostgreSQL", "dbt", "Python", "Data Modeling", "Tableau", "BigQuery"], "degree": "B.S. Computer Science, Universitas Gadjah Mada", "company": "Loka Commerce Data", "primary_job": 3},
    {"name": "Priya Nair", "handle": "priya.nair", "loc": "Bengaluru, IN", "yrs": 7, "headline": "Security Architect | AppSec, OAuth 2.0 & API Hardening", "skills": ["Security Auditing", "OWASP", "OAuth 2.0", "Python", "TypeScript", "PostgreSQL", "GitHub Actions"], "degree": "B.Tech. Computer Science, NIT Surathkal", "company": "Aegis Payment Stack", "primary_job": 4},
    {"name": "Lucas Fernandez", "handle": "lucas.fernandez", "loc": "Melbourne, AU", "yrs": 6, "headline": "Product Manager | Enterprise Collaboration & Analytics", "skills": ["Product Strategy", "Stakeholder Communication", "User Research", "Agile Delivery", "SQL", "Project Management"], "degree": "B.Com. Information Systems, University of Melbourne", "company": "Southern Cross SaaS", "primary_job": 5},
    {"name": "Siti Rahmawati", "handle": "siti.rahmawati", "loc": "Surabaya, ID", "yrs": 6, "headline": "Senior Frontend Engineer | React, TypeScript & Testing", "skills": ["TypeScript", "React", "Next.js", "Vitest", "Playwright", "Tailwind CSS", "REST API"], "degree": "B.S. Information Systems, ITS Surabaya", "company": "Karya Digital Supply", "primary_job": 0},
    {"name": "Kenji Sato", "handle": "kenji.sato", "loc": "Osaka, JP", "yrs": 5, "headline": "Platform Infrastructure Engineer | Kubernetes, Terraform & AWS", "skills": ["Docker", "Kubernetes", "Terraform", "AWS", "CI/CD", "Linux", "Go", "PostgreSQL"], "degree": "B.Eng. Systems Engineering, Osaka University", "company": "Aoi Cloud Infrastructure", "primary_job": 6},
    {"name": "Farah Al-Mansoor", "handle": "farah.almansoor", "loc": "Dubai, AE", "yrs": 4, "headline": "Talent Operations Coordinator | Structured Hiring Programs", "skills": ["Hiring and Interviewing", "Stakeholder Communication", "Process Improvement", "Project Management", "Documentation"], "degree": "B.A. Organizational Psychology, University of Wollongong Dubai", "company": "Crescent Tech Group", "primary_job": 7},
    {"name": "Owen Gallagher", "handle": "owen.gallagher", "loc": "Dublin, IE", "yrs": 8, "headline": "Staff Backend Engineer | FastAPI, SQLAlchemy & Security", "skills": ["Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "Pytest", "Docker", "OAuth 2.0", "System Design"], "degree": "B.Sc. Computer Science, Trinity College Dublin", "company": "Emerald Core Services", "primary_job": 1},
    {"name": "Ayu Lestari", "handle": "ayu.lestari", "loc": "Jakarta, ID", "yrs": 4, "headline": "Product Designer | SaaS Dashboards & Design Systems", "skills": ["Figma", "Design Systems", "User Research", "WCAG", "Tailwind CSS"], "degree": "B.Des. Visual Communication, Bina Nusantara University", "company": "Sentra HR Tools", "primary_job": 2},
    {"name": "Vikram Deshmukh", "handle": "vikram.deshmukh", "loc": "Pune, IN", "yrs": 6, "headline": "Senior Frontend Developer | TypeScript, Next.js & Performance", "skills": ["TypeScript", "React", "Next.js", "JavaScript", "Playwright", "CI/CD", "GraphQL"], "degree": "B.E. Computer Engineering, Pune University", "company": "Deccan SaaS Labs", "primary_job": 0},
    {"name": "Chloe Beaumont", "handle": "chloe.beaumont", "loc": "Sydney, AU", "yrs": 5, "headline": "Analytics Engineer | PostgreSQL, dbt & Looker", "skills": ["SQL", "PostgreSQL", "dbt", "Looker", "Python", "Data Modeling", "Snowflake"], "degree": "M.S. Data Science, University of Sydney", "company": "Harbour Insights", "primary_job": 3},
    {"name": "Reza Mahendra", "handle": "reza.mahendra", "loc": "Jakarta, ID", "yrs": 5, "headline": "Backend Developer | Python, Django, FastAPI & Postgres", "skills": ["Python", "FastAPI", "Django", "PostgreSQL", "Docker", "Pytest", "REST API"], "degree": "B.S. Computer Science, Universitas Bina Nusantara", "company": "Nusantara FinCloud", "primary_job": 1},
    {"name": "Hannah Lindqvist", "handle": "hannah.lindqvist", "loc": "Stockholm, SE", "yrs": 7, "headline": "Application Security Lead | Threat Modeling & OWASP", "skills": ["Security Auditing", "OWASP", "OAuth 2.0", "Python", "Kubernetes", "CI/CD", "Incident Response"], "degree": "M.S. Computer Security, KTH Royal Institute", "company": "Nordic Identity Co", "primary_job": 4},
    {"name": "Kevin Chen", "handle": "kevin.chen", "loc": "Taipei, TW", "yrs": 6, "headline": "Senior Frontend Engineer | React, Accessibility & Motion", "skills": ["TypeScript", "React", "Next.js", "Tailwind CSS", "WCAG", "Vitest", "Figma"], "degree": "B.S. Electrical Engineering, National Taiwan University", "company": "Formosa Productivity", "primary_job": 0},
    {"name": "Anisa Putri", "handle": "anisa.putri", "loc": "Bandung, ID", "yrs": 5, "headline": "Product Manager | Operations & Workflow Automation", "skills": ["Product Strategy", "Stakeholder Communication", "Agile Delivery", "User Research", "SQL", "Documentation"], "degree": "B.S. Industrial Engineering, Institut Teknologi Bandung", "company": "Teras Enterprise Ops", "primary_job": 5},
    {"name": "Daniel Park", "handle": "daniel.park", "loc": "Seoul, KR", "yrs": 6, "headline": "Site Reliability & Platform Engineer | AWS, Terraform & Linux", "skills": ["Docker", "Kubernetes", "Terraform", "AWS", "Linux", "CI/CD", "PostgreSQL", "Incident Response"], "degree": "B.S. Computer Science, Yonsei University", "company": "HanRiver Cloud", "primary_job": 6},
    {"name": "Maya Subramanian", "handle": "maya.subramanian", "loc": "Chennai, IN", "yrs": 4, "headline": "Data Engineer | SQL, Python & Warehouse Modeling", "skills": ["SQL", "PostgreSQL", "Python", "dbt", "Airflow", "Pandas", "Data Modeling"], "degree": "B.Tech. Information Technology, Anna University", "company": "Coromandel Analytics", "primary_job": 3},
    {"name": "Jordi Navarro", "handle": "jordi.navarro", "loc": "Barcelona, ES", "yrs": 7, "headline": "Senior Full-Stack Engineer | TypeScript, React & Python", "skills": ["TypeScript", "React", "Next.js", "Python", "FastAPI", "PostgreSQL", "Playwright"], "degree": "B.S. Software Engineering, Universitat Politecnica de Catalunya", "company": "Sagrada Cloud", "primary_job": 0},
    {"name": "Grace Okafor", "handle": "grace.okafor", "loc": "London, UK", "yrs": 5, "headline": "Security Engineer | Web AppSec & Cloud Compliance", "skills": ["Security Auditing", "OWASP", "OAuth 2.0", "AWS", "GitHub Actions", "Python"], "degree": "M.Sc. Cyber Security, University of Bristol", "company": "Thames Digital Trust", "primary_job": 4},
    {"name": "Fajar Hidayat", "handle": "fajar.hidayat", "loc": "Jakarta, ID", "yrs": 4, "headline": "Backend Python Engineer | FastAPI & PostgreSQL", "skills": ["Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "Alembic", "Docker", "GitHub Actions"], "degree": "B.S. Informatics, Telkom University", "company": "Surya Logistics API", "primary_job": 1},
    {"name": "Sofia Morales", "handle": "sofia.morales", "loc": "Madrid, ES", "yrs": 6, "headline": "Senior Product Designer | Systems & Research", "skills": ["Figma", "Design Systems", "User Research", "WCAG", "Product Strategy", "Mentoring"], "degree": "M.A. Digital Product Design, Elisava", "company": "Solstice Enterprise UX", "primary_job": 2},
    {"name": "Ethan Brooks", "handle": "ethan.brooks", "loc": "Auckland, NZ", "yrs": 5, "headline": "Product Manager | Data & Workflow Platforms", "skills": ["Product Strategy", "Stakeholder Communication", "User Research", "SQL", "Agile Delivery"], "degree": "B.Sc. Computer Science, University of Auckland", "company": "Tasman SaaS", "primary_job": 5},
    {"name": "Linh Nguyen", "handle": "linh.nguyen", "loc": "Ho Chi Minh City, VN", "yrs": 5, "headline": "Frontend Engineer | React, TypeScript & Design Systems", "skills": ["TypeScript", "React", "Next.js", "Tailwind CSS", "Vitest", "Design Systems"], "degree": "B.Eng. Computer Science, HCMUT", "company": "Mekong Product Studio", "primary_job": 0},
    {"name": "Tariq Hassan", "handle": "tariq.hassan", "loc": "Singapore, SG", "yrs": 6, "headline": "Backend Platform Engineer | Python, PostgreSQL & Kafka", "skills": ["Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "Kafka", "Docker", "Pytest"], "degree": "B.Comp. Computer Science, NUS", "company": "Straits FinData", "primary_job": 1},
    {"name": "Clara Novak", "handle": "clara.novak", "loc": "Prague, CZ", "yrs": 4, "headline": "UX & Product Designer | Accessible Web Interfaces", "skills": ["Figma", "Design Systems", "WCAG", "User Research", "Accessibility Advocacy"], "degree": "B.A. Graphic & Digital Design, UMPRUM", "company": "Vltava Design Lab", "primary_job": 2},
    {"name": "Bagus Pratama", "handle": "bagus.pratama", "loc": "Semarang, ID", "yrs": 3, "headline": "Analytics Engineer | PostgreSQL, dbt & Looker", "skills": ["SQL", "PostgreSQL", "dbt", "Looker", "Python", "Data Modeling"], "degree": "B.S. Mathematics, Universitas Diponegoro", "company": "Jawa Commerce Tech", "primary_job": 3},
    {"name": "Nora Alverez", "handle": "nora.alverez", "loc": "Manila, PH", "yrs": 5, "headline": "Talent Operations Specialist | Recruiting Systems", "skills": ["Hiring and Interviewing", "Stakeholder Communication", "Process Improvement", "Project Management", "Agile Delivery"], "degree": "B.S. Psychology, University of the Philippines", "company": "Pacific Talent Group", "primary_job": 7},
    {"name": "Yusuf Ibrahim", "handle": "yusuf.ibrahim", "loc": "Kuala Lumpur, MY", "yrs": 6, "headline": "DevOps & Infrastructure Engineer | Docker, Terraform & GCP", "skills": ["Docker", "Kubernetes", "Terraform", "GCP", "CI/CD", "Linux", "Python"], "degree": "B.Eng. Computer Engineering, UTM", "company": "Selangor Cloud Ops", "primary_job": 6},
    {"name": "Amara Osei", "handle": "amara.osei", "loc": "Amsterdam, NL", "yrs": 5, "headline": "Application Security Engineer | OWASP & Secure SDLC", "skills": ["Security Auditing", "OWASP", "OAuth 2.0", "TypeScript", "Python", "CI/CD"], "degree": "M.Sc. Software Engineering, University of Amsterdam", "company": "CanalPay Security", "primary_job": 4},
    {"name": "Dewi Kartika", "handle": "dewi.kartika", "loc": "Jakarta, ID", "yrs": 7, "headline": "Senior Product Manager | Enterprise Operations", "skills": ["Product Strategy", "Stakeholder Communication", "User Research", "Agile Delivery", "SQL", "Process Improvement"], "degree": "M.B.A. Strategy, Universitas Indonesia", "company": "Mandala B2B Suite", "primary_job": 5},
    {"name": "Liam O'Connor", "handle": "liam.oconnor", "loc": "Brisbane, AU", "yrs": 4, "headline": "Frontend Engineer | TypeScript, React & Next.js", "skills": ["TypeScript", "React", "Next.js", "JavaScript", "Tailwind CSS", "Playwright"], "degree": "B.IT. Software Development, Queensland University of Technology", "company": "Coral Coast Web", "primary_job": 0},
    {"name": "Sora Takahashi", "handle": "sora.takahashi", "loc": "Fukuoka, JP", "yrs": 5, "headline": "Backend Engineer | Python, FastAPI & Data APIs", "skills": ["Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "Pytest", "REST API", "OpenAPI"], "degree": "B.S. Computer Science, Kyushu University", "company": "Kyushu Mobility Tech", "primary_job": 1},
]

STAGE_PROGRESSION_PATHS: dict[str, list[str]] = {
    "applied": ["applied"],
    "screening": ["applied", "screening"],
    "shortlisted": ["applied", "screening", "shortlisted"],
    "interview": ["applied", "screening", "shortlisted", "interview"],
    "offer": ["applied", "screening", "shortlisted", "interview", "offer"],
    "hired": ["applied", "screening", "shortlisted", "interview", "offer", "hired"],
    "rejected": ["applied", "screening", "rejected"],
}

# Exact distribution of 60 applications across the 7 stages for realistic funnels & charts.
TARGET_STAGES_60: list[str] = (
    ["applied"] * 12
    + ["screening"] * 11
    + ["shortlisted"] * 9
    + ["interview"] * 12
    + ["offer"] * 5
    + ["hired"] * 4
    + ["rejected"] * 7
)


def _ensure_synthetic_resume_file(candidate_bp: dict[str, Any], idx: int) -> tuple[str, int, str, str]:
    """Generate and cache a synthetic PDF resume on disk; returns (rel_path, size, sha256, extracted_text)."""
    settings = get_settings()
    template_dir = settings.storage_root / "demo_templates"
    template_dir.mkdir(parents=True, exist_ok=True)
    filename = f"synthetic_resume_{idx:02d}_{candidate_bp['handle'].replace('.', '_')}.pdf"
    rel_path = f"demo_templates/{filename}"
    full_path = template_dir / filename

    lines = [
        "SYNTHETIC DEMONSTRATION RESUME - NO REAL PERSONAL DATA",
        f"Email: {candidate_bp['handle']}@demo.example.com | Location: {candidate_bp['loc']}",
        f"Headline: {candidate_bp['headline']}",
        "",
        "SUMMARY",
        f"Experienced practitioner with {candidate_bp['yrs']}+ years delivering production web systems and",
        f"collaborative workflows at {candidate_bp['company']}. Focused on maintainable architecture,",
        "clear documentation, and measurable reliability.",
        "",
        "WORK EXPERIENCE",
        f"Senior Practitioner | {candidate_bp['company']} (2022 - Present)",
        f"- Led core initiatives using {', '.join(candidate_bp['skills'][:4])} for enterprise customers.",
        f"- Collaborated across engineering, product, and design on {candidate_bp['skills'][0]} delivery.",
        "- Improved automated testing, review standards, and WCAG / security hygiene across releases.",
        "Specialist | Horizon Digital Works (2019 - 2022)",
        f"- Built production workflows leveraging {', '.join(candidate_bp['skills'][2:6] or candidate_bp['skills'][:3])}.",
        "- Partnered with hiring teams to run structured technical interviews and onboarding.",
        "",
        "EDUCATION",
        candidate_bp["degree"],
        "",
        "TECHNICAL SKILLS",
        ", ".join(candidate_bp["skills"]),
        "",
        "CERTIFICATIONS",
        "Structured Engineering & Cloud Foundations Certificate (Synthetic Demo Credential)",
    ]
    extracted_text = "\n".join(lines)

    if not full_path.exists():
        pdf_bytes = generate_synthetic_pdf_bytes(f"{candidate_bp['name']} - Synthetic Resume", lines)
        full_path.write_bytes(pdf_bytes)
    else:
        pdf_bytes = full_path.read_bytes()

    sha = hashlib.sha256(pdf_bytes).hexdigest()
    return rel_path, len(pdf_bytes), sha, extracted_text


def _seed_organization_dataset(
    db: Session,
    *,
    org_name: str,
    org_slug: str,
    is_public_showcase: bool,
    demo_session_id: str | None,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    email_suffix = "showcase" if is_public_showcase else (demo_session_id or uuid.uuid4().hex[:8])

    org = Organization(
        name=org_name,
        slug=org_slug,
        description=(
            "Fictional demonstration organization seeded with synthetic recruitment records "
            "for evaluating TalentOS workflows without real personal data."
        ),
        website="https://demo.talentos.invalid",
        industry="Enterprise Software (Demonstration Dataset)",
        default_timezone="Asia/Jakarta",
        document_retention_days=180,
        is_demo=True,
        is_public_showcase=is_public_showcase,
        demo_session_id=demo_session_id,
    )
    db.add(org)
    db.flush()

    team_specs = [
        ("Clara Halim", f"clara.owner+{email_suffix}@demo.example.com", "organization_owner", "VP of People & Talent", "People"),
        ("Rafi Pratama", f"rafi.recruiter+{email_suffix}@demo.example.com", "recruiter", "Lead Technical Recruiter", "People"),
        ("Daniel Kowalski", f"daniel.hm+{email_suffix}@demo.example.com", "hiring_manager", "Director of Engineering", "Engineering"),
    ]
    team_users: dict[str, User] = {}
    for full_name, email, role, title, dept in team_specs:
        user = User(
            email=email,
            password_hash=_DEMO_PASSWORD_HASH,
            full_name=full_name,
            account_type="recruiter",
            is_active=True,
            is_verified=True,
            is_demo=True,
            demo_session_id=demo_session_id,
        )
        db.add(user)
        db.flush()
        db.add(UserProfile(user_id=user.id, location="Jakarta / Singapore", timezone="Asia/Jakarta", headline=title))
        db.add(UserPreference(user_id=user.id, theme="system", default_timezone="Asia/Jakarta"))
        db.add(
            OrganizationMember(
                organization_id=org.id,
                user_id=user.id,
                role=role,
                status="active",
                title=title,
                department=dept,
            )
        )
        team_users[role] = user

    owner_user = team_users["organization_owner"]
    recruiter_user = team_users["recruiter"]
    hm_user = team_users["hiring_manager"]

    # Create a dedicated candidate portal demo user tied to Candidate #0 (Nadia Kusuma).
    demo_candidate_user = User(
        email=f"nadia.candidate+{email_suffix}@demo.example.com",
        password_hash=_DEMO_PASSWORD_HASH,
        full_name=CANDIDATE_BLUEPRINTS[0]["name"],
        account_type="candidate",
        is_active=True,
        is_verified=True,
        is_demo=True,
        demo_session_id=demo_session_id,
    )
    db.add(demo_candidate_user)
    db.flush()
    db.add(
        UserProfile(
            user_id=demo_candidate_user.id,
            phone="+62 812-0000-0101 (Synthetic)",
            location=CANDIDATE_BLUEPRINTS[0]["loc"],
            timezone="Asia/Jakarta",
            headline=CANDIDATE_BLUEPRINTS[0]["headline"],
            bio=(
                "Synthetic demonstration candidate profile. Focused on React, TypeScript, "
                "accessible design systems, and collaborative frontend architecture."
            ),
            years_of_experience=CANDIDATE_BLUEPRINTS[0]["yrs"],
            skills=list(CANDIDATE_BLUEPRINTS[0]["skills"]),
            education=[{"institution": "Institut Teknologi Bandung", "degree": "B.S. Computer Science", "end_year": "2019"}],
            work_experience=[
                {
                    "company": "Northwind Logistics Tech (Synthetic)",
                    "role": "Staff Frontend Engineer",
                    "start_date": "2022-03",
                    "end_date": "Present",
                    "highlights": [
                        "Architected shared Next.js App Router component primitives used across 4 internal tools.",
                        "Led WCAG 2.2 AA accessibility remediation and Playwright end-to-end test suite.",
                    ],
                }
            ],
            linkedin_url="https://demo.talentos.invalid/in/nadia-kusuma",
            portfolio_url="https://demo.talentos.invalid/nadia-kusuma",
            consent_resume_processing=True,
            consent_recorded_at=now - timedelta(days=12),
        )
    )
    db.add(UserPreference(user_id=demo_candidate_user.id, theme="system", default_timezone="Asia/Jakarta"))

    # Seed 8 job openings + normalized job_requirements rows.
    jobs: list[Job] = []
    for idx, spec in enumerate(JOB_BLUEPRINTS):
        slug = spec["key"] if is_public_showcase else f"{spec['key']}-{email_suffix[:8]}"
        published_at = now - timedelta(days=38 - idx * 3) if spec["status"] in {"published", "paused"} else None
        job = Job(
            organization_id=org.id,
            slug=slug,
            title=spec["title"],
            department=spec["department"],
            employment_type=spec["employment_type"],
            work_arrangement=spec["work_arrangement"],
            location=spec["location"],
            salary_min=spec["salary_min"],
            salary_max=spec["salary_max"],
            salary_currency=spec["salary_currency"],
            description=spec["description"],
            responsibilities=spec["responsibilities"],
            required_qualifications=spec["required_qualifications"],
            preferred_qualifications=spec["preferred_qualifications"],
            required_skills=spec["required_skills"],
            status=spec["status"],
            openings_count=spec["openings_count"],
            application_deadline=now + timedelta(days=spec["deadline_days"]),
            created_by_id=recruiter_user.id,
            hiring_manager_id=hm_user.id,
            is_demo=True,
            published_at=published_at,
        )
        db.add(job)
        db.flush()
        jobs.append(job)

        sort_idx = 0
        for req_text in spec["required_qualifications"]:
            db.add(JobRequirement(organization_id=org.id, job_id=job.id, category="required", label=req_text, weight=2, sort_order=sort_idx))
            sort_idx += 1
        for pref_text in spec["preferred_qualifications"]:
            db.add(JobRequirement(organization_id=org.id, job_id=job.id, category="preferred", label=pref_text, weight=1, sort_order=sort_idx))
            sort_idx += 1
        for skill in spec["required_skills"]:
            db.add(JobRequirement(organization_id=org.id, job_id=job.id, category="skill", label=skill, weight=1, sort_order=sort_idx))
            sort_idx += 1

    # Seed 40 fictional candidates + synthetic PDF resumes + normalized candidate_skills.
    candidates: list[Candidate] = []
    candidate_docs: list[CandidateDocument] = []
    for idx, bp in enumerate(CANDIDATE_BLUEPRINTS):
        linked_user_id = demo_candidate_user.id if idx == 0 else None
        cand = Candidate(
            organization_id=org.id,
            user_id=linked_user_id,
            full_name=bp["name"],
            email=f"{bp['handle']}@demo.example.com",
            phone=f"+62 812-0000-{1000 + idx:04d} (Synthetic)",
            location=bp["loc"],
            headline=bp["headline"],
            professional_summary=(
                f"{bp['yrs']}+ years experience in {bp['skills'][0]} and {bp['skills'][1]} "
                f"at {bp['company']} (synthetic portfolio dataset)."
            ),
            years_of_experience=bp["yrs"],
            education=[{"institution": bp["degree"].split(", ")[-1], "degree": bp["degree"].split(", ")[0], "end_year": str(2024 - bp["yrs"])}],
            work_experience=[
                {
                    "company": f"{bp['company']} (Synthetic)",
                    "role": bp["headline"].split(" | ")[0],
                    "start_date": f"{2026 - min(bp['yrs'], 4)}-02",
                    "end_date": "Present",
                    "highlights": [
                        f"Delivered production milestones using {', '.join(bp['skills'][:3])}.",
                        f"Collaborated with engineering and product leaders on {bp['skills'][-1]}.",
                    ],
                }
            ],
            linkedin_url=f"https://demo.talentos.invalid/in/{bp['handle'].replace('.', '-')}",
            portfolio_url=f"https://demo.talentos.invalid/{bp['handle'].replace('.', '-')}",
            consent_resume_processing=True,
            consent_recorded_at=now - timedelta(days=35 - (idx % 25)),
            retention_expires_at=now + timedelta(days=180),
            is_demo=True,
        )
        db.add(cand)
        db.flush()
        candidates.append(cand)

        for s_idx, skill_name in enumerate(bp["skills"]):
            db.add(
                CandidateSkill(
                    organization_id=org.id,
                    candidate_id=cand.id,
                    skill_name=skill_name,
                    category="professional" if skill_name in {"Technical Leadership", "Mentoring", "Stakeholder Communication", "Product Strategy", "User Research", "Agile Delivery", "Cross-functional Collaboration", "Process Improvement", "Hiring and Interviewing", "Project Management", "Documentation", "Accessibility Advocacy"} else "technical",
                    proficiency="advanced" if s_idx < 3 else "intermediate",
                    source="resume_extracted" if s_idx % 2 == 0 else "profile",
                )
            )

        rel_path, size_bytes, sha_hex, extracted_text = _ensure_synthetic_resume_file(bp, idx)
        doc = CandidateDocument(
            organization_id=org.id,
            candidate_id=cand.id,
            user_id=linked_user_id,
            document_type="resume",
            original_filename=f"{bp['handle'].replace('.', '_')}_resume_demo.pdf",
            stored_path=rel_path,
            mime_type="application/pdf",
            file_size_bytes=size_bytes,
            sha256_hash=sha_hex,
            extracted_text=extracted_text,
            consent_granted=True,
            is_demo=True,
        )
        db.add(doc)
        db.flush()
        candidate_docs.append(doc)

    # Seed 60 applications (40 primary + 20 secondary applications across distinct jobs).
    app_pairs: list[tuple[int, int]] = []
    for c_idx, bp in enumerate(CANDIDATE_BLUEPRINTS):
        app_pairs.append((c_idx, bp["primary_job"]))
    for extra_idx in range(20):
        c_idx = extra_idx
        primary_j = CANDIDATE_BLUEPRINTS[c_idx]["primary_job"]
        # Pick a distinct secondary published job (indices 0..5).
        secondary_j = (primary_j + 1 + (extra_idx % 4)) % 6
        if secondary_j == primary_j:
            secondary_j = (primary_j + 1) % 6
        app_pairs.append((c_idx, secondary_j))

    applications: list[Application] = []
    for app_idx, (c_idx, j_idx) in enumerate(app_pairs):
        target_stage = TARGET_STAGES_60[app_idx]
        # Ensure Candidate #0 (Nadia Kusuma) has interview + shortlisted stages for a great candidate portal demo.
        if app_idx == 0:
            target_stage = "interview"
        elif app_idx == 40:
            target_stage = "shortlisted"

        days_ago = 42 - ((app_idx * 7) % 39)
        applied_at = now - timedelta(days=days_ago, hours=(app_idx % 8))
        path = STAGE_PROGRESSION_PATHS[target_stage]
        step_delta = max(2, min(5, days_ago // max(len(path), 1)))
        last_activity = applied_at + timedelta(days=step_delta * (len(path) - 1))
        if last_activity > now - timedelta(hours=2):
            last_activity = now - timedelta(hours=3 + (app_idx % 10))

        decision_reason = None
        if target_stage == "hired":
            decision_reason = "Strong panel alignment across technical architecture and team collaboration."
        elif target_stage == "rejected":
            decision_reason = "Role required deeper production experience in primary stack; invited to stay in touch."

        application = Application(
            organization_id=org.id,
            job_id=jobs[j_idx].id,
            candidate_id=candidates[c_idx].id,
            resume_document_id=candidate_docs[c_idx].id,
            stage=target_stage,
            assigned_recruiter_id=recruiter_user.id if app_idx % 3 != 0 else owner_user.id,
            cover_note=(
                f"Interested in contributing to {jobs[j_idx].title} at {org.name} "
                f"with experience in {', '.join(CANDIDATE_BLUEPRINTS[c_idx]['skills'][:3])}."
            ),
            decision_reason=decision_reason,
            source=["careers_portal", "referral", "direct_sourcing", "careers_portal"][app_idx % 4],
            applied_at=applied_at,
            last_activity_at=last_activity,
        )
        db.add(application)
        db.flush()
        applications.append(application)

        prev_stage: str | None = None
        for step_idx, stage_name in enumerate(path):
            changed_at = applied_at + timedelta(days=step_delta * step_idx)
            if changed_at > now:
                changed_at = now - timedelta(hours=2)
            db.add(
                ApplicationStageHistory(
                    organization_id=org.id,
                    application_id=application.id,
                    from_stage=prev_stage,
                    to_stage=stage_name,
                    changed_by_id=recruiter_user.id if prev_stage else None,
                    reason=decision_reason if step_idx == len(path) - 1 else None,
                    changed_at=changed_at,
                )
            )
            prev_stage = stage_name

    # Seed pre-computed rule-based evidence analyses for the first 16 applications so
    # candidate profiles and analytics show rich evidence immediately (and users can re-run anytime).
    for app_idx in range(16):
        app_row = applications[app_idx]
        cand_idx = app_pairs[app_idx][0]
        job_idx = app_pairs[app_idx][1]
        doc = candidate_docs[cand_idx]
        job = jobs[job_idx]
        result = _RULE_PROVIDER.analyze(
            resume_text=doc.extracted_text or "",
            job_title=job.title,
            required_qualifications=job.required_qualifications,
            preferred_qualifications=job.preferred_qualifications,
            required_skills=job.required_skills,
        )
        db.add(
            ResumeAnalysis(
                organization_id=org.id,
                application_id=app_row.id,
                candidate_id=app_row.candidate_id,
                job_id=job.id,
                document_id=doc.id,
                analysis_mode=result.analysis_mode,
                provider_name=result.provider_name,
                model_name=result.model_name,
                prompt_injection_flags=result.prompt_injection_flags,
                structured_output=result.structured_output.model_dump(),
                human_reviewed=app_idx < 6,
                reviewed_by_id=recruiter_user.id if app_idx < 6 else None,
                reviewed_at=now - timedelta(days=2) if app_idx < 6 else None,
            )
        )

    # Seed 12 scheduled / completed interviews (including 2 for demo candidate Nadia Kusuma).
    interview_candidates = [
        app for app in applications if app.stage in {"interview", "offer", "hired"}
    ][:12]
    interview_types = ["technical", "system_design", "panel", "behavioral", "screening", "final"]
    for i_idx, app_row in enumerate(interview_candidates):
        is_completed = i_idx >= 7
        offset_days = -(i_idx - 5) if is_completed else (i_idx + 1)
        start_time = (now + timedelta(days=offset_days)).replace(hour=9 + (i_idx % 6), minute=0, second=0, microsecond=0)
        duration = 60 if i_idx % 2 == 0 else 45
        end_time = start_time + timedelta(minutes=duration)
        itype = interview_types[i_idx % len(interview_types)]

        interview = Interview(
            organization_id=org.id,
            application_id=app_row.id,
            job_id=app_row.job_id,
            candidate_id=app_row.candidate_id,
            title=f"{itype.replace('_', ' ').title()} Interview",
            interview_type=itype,
            status="completed" if is_completed else "scheduled",
            scheduled_start=start_time,
            scheduled_end=end_time,
            duration_minutes=duration,
            timezone="Asia/Jakarta",
            meeting_link=f"https://meet.demo.talentos.invalid/room-{i_idx + 1:02d}",
            location="Video Conference (Synthetic Demo Link)",
            instructions="Structured rubric walkthrough. Please review the submitted resume evidence prior to joining.",
            created_by_id=recruiter_user.id,
        )
        db.add(interview)
        db.flush()

        db.add(
            InterviewParticipant(
                organization_id=org.id,
                interview_id=interview.id,
                user_id=hm_user.id,
                role="lead_interviewer",
                attendance_status="accepted",
            )
        )
        db.add(
            InterviewParticipant(
                organization_id=org.id,
                interview_id=interview.id,
                user_id=recruiter_user.id,
                role="interviewer",
                attendance_status="accepted",
            )
        )

        if is_completed:
            db.add(
                InterviewFeedback(
                    organization_id=org.id,
                    interview_id=interview.id,
                    reviewer_id=hm_user.id,
                    recommendation="strong_yes" if i_idx % 2 == 0 else "yes",
                    strengths="Clear architectural reasoning, concise trade-off explanations, and grounded delivery examples.",
                    concerns="Would benefit from deeper exposure to multi-region database migrations during onboarding.",
                    notes="Recommended to advance to final panel discussion.",
                    rubric_scores={
                        "technical_depth": 5 if i_idx % 2 == 0 else 4,
                        "problem_solving": 4,
                        "communication": 5,
                        "collaboration": 4,
                    },
                    submitted_at=end_time + timedelta(hours=2),
                )
            )

    # Seed private recruiter notes (must NEVER be exposed to candidate accounts).
    for n_idx in range(6):
        db.add(
            RecruiterNote(
                organization_id=org.id,
                candidate_id=candidates[n_idx].id,
                application_id=applications[n_idx].id,
                author_id=recruiter_user.id if n_idx % 2 == 0 else hm_user.id,
                content=(
                    "Internal hiring team note: Candidate aligned on role scope, notice period, "
                    "and compensation band during initial screening call."
                ),
                is_private=True,
            )
        )

    # Seed realistic notifications for recruiter, hiring manager, owner, and demo candidate.
    notif_specs = [
        (recruiter_user.id, "new_application", "New application received", f"{candidates[0].full_name} applied for {jobs[0].title}.", f"/workspace/candidates/{candidates[0].id}"),
        (recruiter_user.id, "resume_analysis_completed", "Resume evidence extraction ready", f"Rule-based qualification review finished for {candidates[1].full_name}.", f"/workspace/candidates/{candidates[1].id}"),
        (recruiter_user.id, "interview_scheduled", "Upcoming interview tomorrow", f"Technical interview with {candidates[0].full_name} is confirmed.", "/workspace/interviews"),
        (hm_user.id, "interview_scheduled", "Assigned as lead interviewer", f"You are scheduled to interview {candidates[0].full_name} for {jobs[0].title}.", "/workspace/interviews"),
        (owner_user.id, "application_status_updated", "Candidate moved to Offer stage", f"Hiring team advanced an applicant to Offer for {jobs[1].title}.", "/workspace/pipeline"),
        (demo_candidate_user.id, "interview_scheduled", "Interview invitation confirmed", f"Your technical interview for {jobs[0].title} at {org.name} is scheduled.", "/candidate/interviews"),
        (demo_candidate_user.id, "application_status_updated", "Application status updated", f"Your application for {jobs[0].title} moved to Interview.", f"/candidate/applications/{applications[0].id}"),
    ]
    for u_id, etype, title, body, link in notif_specs:
        db.add(
            Notification(
                organization_id=org.id,
                user_id=u_id,
                event_type=etype,
                title=title,
                body=body,
                link_url=link,
                is_read=False,
            )
        )

    # Seed recent activity logs.
    activity_entries = [
        (recruiter_user.id, "application", str(applications[0].id), "stage_changed", f"Moved {candidates[0].full_name} to Interview for {jobs[0].title}"),
        (hm_user.id, "interview", str(interview_candidates[-1].id), "feedback_submitted", f"Submitted structured interview scorecard for {jobs[1].title}"),
        (recruiter_user.id, "resume_analysis", str(candidates[1].id), "analysis_reviewed", f"Completed human review of rule-based resume evidence for {candidates[1].full_name}"),
        (owner_user.id, "job", str(jobs[0].id), "job_published", f"Published {jobs[0].title} to the public careers board"),
        (recruiter_user.id, "job", str(jobs[2].id), "job_updated", f"Updated qualification checklist for {jobs[2].title}"),
    ]
    for a_idx, (actor_id, etype, eid, action, summary) in enumerate(activity_entries):
        db.add(
            ActivityLog(
                organization_id=org.id,
                actor_id=actor_id,
                entity_type=etype,
                entity_id=eid,
                action=action,
                summary=summary,
                created_at=now - timedelta(hours=2 + a_idx * 5),
            )
        )

    db.commit()
    return {
        "organization": org,
        "owner": owner_user,
        "recruiter": recruiter_user,
        "hiring_manager": hm_user,
        "candidate": demo_candidate_user,
    }


def ensure_public_showcase_seeded(db: Session) -> Organization:
    existing = db.scalar(select(Organization).where(Organization.slug == PUBLIC_SHOWCASE_SLUG))
    if existing:
        return existing
    seeded = _seed_organization_dataset(
        db,
        org_name="Alder & Finch Systems (Demo)",
        org_slug=PUBLIC_SHOWCASE_SLUG,
        is_public_showcase=True,
        demo_session_id="public-showcase",
    )
    return seeded["organization"]


def create_isolated_demo_session(db: Session, role: str) -> tuple[User, Organization | None, OrganizationMember | None]:
    """Create a completely isolated per-visitor demo workspace with synthetic records."""
    session_token = uuid.uuid4().hex[:10]
    seeded = _seed_organization_dataset(
        db,
        org_name="Alder & Finch Systems (Demo)",
        org_slug=f"alder-finch-demo-{session_token}",
        is_public_showcase=False,
        demo_session_id=session_token,
    )
    org: Organization = seeded["organization"]
    if role == "candidate":
        return seeded["candidate"], None, None

    user: User = seeded["hiring_manager"] if role == "hiring_manager" else seeded["recruiter"]
    membership = db.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == user.id,
        )
    )
    return user, org, membership
