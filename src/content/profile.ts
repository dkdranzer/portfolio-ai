// All site copy lives here. Edit this file to update the portfolio.

export const profile = {
  name: "Dinesh Kumar G",
  role: "AI Engineer",
  headline: "Software Engineer building multi-agent AI systems for healthcare.",
  location: "Bangalore, India",
  email: "dineshkumartech3@gmail.com",
  linkedin: "https://linkedin.com/in/dinesh-kumar-g-5741132a4",
  github: "https://github.com/dkdranzer",
  resumeUrl: "/Dinesh_Kumar_Resume.pdf",

  // The prompt typed in the opening terminal
  prompt: "who is dinesh kumar g?",

  // Temperature slider (About section). Low = factual, high = personal.
  bios: [
    {
      t: 0.1,
      label: "deterministic",
      text: "Software Engineer at HealthFoundry.ai, Bangalore. Builds event-driven, multi-agent AI systems for healthcare in Python and TypeScript on GCP and AWS. B.E. Computer Science, BMS College of Engineering, CGPA 8.94.",
    },
    {
      t: 0.6,
      label: "balanced",
      text: "I design and ship the plumbing that lets AI agents do real work in healthcare: LangGraph orchestration, Pub/Sub messaging, real-time notifications and human-in-the-loop routing. I also own the observability and platform SDK layers that the rest of the company builds on.",
    },
    {
      t: 1.0,
      label: "creative",
      text: "I joined HealthFoundry.ai as a data engineering intern and, within a year, was the engineer other teams called when an agent needed to reach a real person, a real record, or a real dashboard. I like closing loops: from a call recording to a CRM lead, from a discharge summary to a FHIR resource, from a trace to the fix. Healthcare is where I want AI to be boringly reliable.",
    },
  ],

  stats: [
    { value: "8", label: "services instrumented" },
    { value: "2", label: "roles at HealthFoundry.ai" },
    { value: "8.94", label: "CGPA · BMSCE" },
  ],

  // Skills. `w` (0–1) is how strongly the node glows in the network.
  skills: [
    { id: "langgraph", name: "LangGraph", w: 1 },
    { id: "python", name: "Python", w: 0.95 },
    { id: "typescript", name: "TypeScript", w: 0.85 },
    { id: "gemini", name: "Gemini", w: 0.85 },
    { id: "pubsub", name: "Pub/Sub", w: 0.8 },
    { id: "fastapi", name: "FastAPI", w: 0.8 },
    { id: "rag", name: "RAG", w: 0.7 },
    { id: "otel", name: "OpenTelemetry", w: 0.75 },
    { id: "firestore", name: "Firestore", w: 0.75 },
    { id: "fhir", name: "FHIR / HL7", w: 0.65 },
    { id: "langchain", name: "LangChain", w: 0.7 },
    { id: "docker", name: "Docker", w: 0.65 },
    { id: "sse", name: "SSE", w: 0.6 },
    { id: "groq", name: "Groq", w: 0.55 },
    { id: "faiss", name: "FAISS", w: 0.55 },
    { id: "mlflow", name: "MLflow", w: 0.55 },
  ],

  // Full toolkit, grouped (shown under the attention view)
  toolkit: [
    { group: "AI / LLM", items: "LangGraph, LangChain, CrewAI, LangSmith, MLflow, MCP, RAG, Hugging Face, PyTorch, TensorFlow" },
    { group: "Architecture", items: "Event-driven, microservices, Pub/Sub, CloudEvents, SSE, human-in-the-loop, multi-agent orchestration" },
    { group: "Cloud & Ops", items: "GCP, Firebase, Cloud SQL, AWS EC2, Docker, Kubernetes, GitHub Actions" },
    { group: "Observability", items: "OpenTelemetry, Grafana, Tempo, Loki, Prometheus" },
  ],

  // Projects. `uses` lists skill ids — this drives the attention lines.
  projects: [
    {
      id: "orchestrator",
      title: "Workflow Orchestrator",
      kind: "HealthFoundry · production",
      blurb: "LangGraph engine that runs declarative, Firestore-stored workflows over REST and Pub/Sub and dispatches each step to the right AI agent.",
      uses: ["langgraph", "python", "pubsub", "firestore", "gemini", "fastapi"],
    },
    {
      id: "hil",
      title: "Human Interaction Layer",
      kind: "HealthFoundry · production",
      blurb: "Real-time routing service: CloudEvents in from Pub/Sub, permission-aware notifications out over Server-Sent Events.",
      uses: ["pubsub", "sse", "firestore", "typescript"],
    },
    {
      id: "clinical",
      title: "Clinical Document Pipeline",
      kind: "HealthFoundry · production",
      blurb: "Discharge summaries to FHIR resources: classification, PHI de-identification with Gemini and SNOMED CT coding.",
      uses: ["langgraph", "gemini", "fhir", "python", "pubsub"],
    },
    {
      id: "observability",
      title: "Observability Stack",
      kind: "HealthFoundry · production",
      blurb: "Tracing, logs, metrics and LLM tracing across 8 FastAPI and Fastify services, shipped with GitHub Actions CI/CD.",
      uses: ["otel", "mlflow", "fastapi", "typescript", "docker"],
    },
    {
      id: "chatbot",
      title: "LangGraph AI Chatbot",
      kind: "Personal · 2025",
      blurb: "Stateful multi-threaded chatbot with persistent memory, Groq LLM tools, streaming and SQLite checkpointing.",
      uses: ["langgraph", "groq", "python", "langchain"],
    },
    {
      id: "rag",
      title: "YouTube Transcript Q&A",
      kind: "Personal · 2025",
      blurb: "RAG over video transcripts with Cohere embeddings, FAISS and ChatGroq. Dockerized on AWS EC2.",
      uses: ["rag", "faiss", "groq", "langchain", "fastapi", "docker"],
    },
  ],

  // Fine-tuning: each role/milestone is an epoch; loss goes down over time.
  epochs: [
    {
      epoch: 1,
      period: "2022 — 2026",
      title: "B.E. Computer Science",
      org: "BMS College of Engineering",
      loss: 0.92,
      points: ["Foundations: data structures, ML, distributed systems.", "Graduated with CGPA 8.94."],
    },
    {
      epoch: 2,
      period: "May — Sep 2025",
      title: "Self-directed LLM projects",
      org: "Personal",
      loss: 0.64,
      points: ["Built a RAG pipeline and a stateful LangGraph chatbot end to end.", "Deployed on AWS EC2 with Docker."],
    },
    {
      epoch: 3,
      period: "Sep 2025 — Jun 2026",
      title: "Data Engineer Intern",
      org: "HealthFoundry.ai (SynapseNet)",
      loss: 0.38,
      points: [
        "Built the Human Interaction Layer: CloudEvents, Firestore rules, real-time SSE.",
        "Built the clinical document pipeline: de-identification, FHIR mapping, SNOMED CT.",
        "Shipped a Chrome extension assistant with one-click actions.",
      ],
    },
    {
      epoch: 4,
      period: "Jul 2026 — now",
      title: "Software Engineer",
      org: "HealthFoundry.ai (SynapseNet)",
      loss: 0.17,
      points: [
        "Designed the LangGraph workflow orchestrator.",
        "Built speech and document intelligence agents on Gemini.",
        "Own observability across 8 services and the shared Platform SDK.",
      ],
    },
  ],

  education: {
    degree: "B.E. Computer Science & Engineering",
    school: "BMS College of Engineering, Bangalore",
    period: "2022 — 2026",
    score: "8.94",
  },
  certifications: ["Python for Data Science · NPTEL", "Machine Learning Professional · RapidMiner"],
  datasets: [
    { name: "healthcare/clinical-docs", size: "FHIR · HL7 · SNOMED CT" },
    { name: "systems/event-driven", size: "Pub/Sub · CloudEvents · SSE" },
    { name: "llm/agents", size: "LangGraph · RAG · MCP" },
    { name: "cs/foundations", size: "BMSCE · 4 years" },
  ],
};

// Each section is one stage of a single inference pass.
export const stages = [
  { id: "prompt", step: "00", label: "Prompt" },
  { id: "embed", step: "01", label: "Embedding" },
  { id: "network", step: "02", label: "Network" },
  { id: "data", step: "03", label: "Training data" },
  { id: "finetune", step: "04", label: "Fine-tuning" },
  { id: "core", step: "05", label: "Projects" },
  { id: "output", step: "06", label: "Output" },
] as const;
