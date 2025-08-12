# System Architecture Diagram

## 🏗️ High-Level System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React UI]
        Router[React Router]
        Components[Components]
        
        UI --> Router
        Router --> Components
    end
    
    subgraph "API Layer"
        API[Express API Server]
        Upload[File Upload Handler]
        ChatAPI[Chat API]
        DocAPI[Document API]
        
        API --> Upload
        API --> ChatAPI
        API --> DocAPI
    end
    
    subgraph "Service Layer"
        DocProcessor[Document Processor]
        AIService[AI Service]
        ChatService[Chat Service]
        IndexService[Key-Value Index Service]
        
        DocProcessor --> AIService
        ChatService --> AIService
        IndexService --> Database
    end
    
    subgraph "AI Providers"
        Google[Google Gemini]
        Claude[Claude AI]
        Mock[Mock Provider]
        
        AIService --> Google
        AIService --> Claude
        AIService --> Mock
    end
    
    subgraph "Database Layer"
        MongoDB[(MongoDB)]
        FormData[(FormData Collection)]
        KeyValueIndex[(KeyValueIndex Collection)]
        ChatHistory[(ChatHistory Collection)]
        
        MongoDB --> FormData
        MongoDB --> KeyValueIndex
        MongoDB --> ChatHistory
    end
    
    subgraph "External Services"
        GoogleVision[Google Vision API]
        Tesseract[Tesseract OCR]
        FileSystem[Local File System]
    end
    
    %% Frontend to API
    Components -->|HTTP Requests| API
    
    %% API to Services
    Upload -->|Process Document| DocProcessor
    ChatAPI -->|AI Query| ChatService
    DocAPI -->|CRUD Operations| IndexService
    
    %% Services to Database
    DocProcessor -->|Store Results| FormData
    DocProcessor -->|Index Data| IndexService
    ChatService -->|Store History| ChatHistory
    
    %% External Dependencies
    DocProcessor -->|OCR Processing| GoogleVision
    DocProcessor -->|Fallback OCR| Tesseract
    Upload -->|File Storage| FileSystem
    
    %% Styling
    classDef frontend fill:#e1f5fe
    classDef api fill:#f3e5f5
    classDef service fill:#e8f5e8
    classDef ai fill:#fff3e0
    classDef database fill:#fce4ec
    classDef external fill:#f1f8e9
    
    class UI,Router,Components frontend
    class API,Upload,ChatAPI,DocAPI api
    class DocProcessor,AIService,ChatService,IndexService service
    class Google,Claude,Mock ai
    class MongoDB,FormData,KeyValueIndex,ChatHistory database
    class GoogleVision,Tesseract,FileSystem external
```

## 📊 Data Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant DocProcessor
    participant AIService
    participant Database
    participant AIProvider
    
    %% Document Upload Flow
    User->>Frontend: Upload Document
    Frontend->>API: POST /api/process-document
    API->>DocProcessor: Process File
    
    alt PDF Document
        DocProcessor->>DocProcessor: Extract Text (pdf-parse)
    else Image Document
        DocProcessor->>DocProcessor: OCR Processing (Tesseract)
    end
    
    DocProcessor->>AIService: Extract Key-Value Pairs
    AIService->>AIProvider: Send Text for Processing
    AIProvider-->>AIService: Return Structured Data
    AIService-->>DocProcessor: Processed Data
    
    DocProcessor->>Database: Store Document Data
    DocProcessor->>Database: Index Key-Value Pairs
    Database-->>API: Success Response
    API-->>Frontend: Processing Complete
    Frontend-->>User: Show Results
    
    %% Chat Query Flow
    User->>Frontend: Ask Question
    Frontend->>API: POST /api/chat/query
    API->>ChatService: Process Query
    ChatService->>Database: Fetch Document Context
    Database-->>ChatService: Return Document Data
    ChatService->>AIService: Generate Response
    AIService->>AIProvider: Process with Context
    AIProvider-->>AIService: AI Response
    AIService-->>ChatService: Response
    ChatService->>Database: Store Chat History
    ChatService-->>API: Final Response
    API-->>Frontend: Chat Response
    Frontend-->>User: Display Answer
```

## 🗄️ Database Schema Diagram

```mermaid
erDiagram
    FormData {
        ObjectId _id PK
        string filename
        string originalFilename
        array keyValuePairs
        number confidence
        string extractedText
        string processingMethod
        object metadata
        date createdAt
    }
    
    KeyValueIndex {
        ObjectId _id PK
        ObjectId documentId FK
        string filename
        string originalFilename
        string key
        string keyNormalized
        mixed value
        string valueType
        date extractedAt
    }
    
    ChatHistory {
        ObjectId _id PK
        string sessionId
        array messages
        date createdAt
        date updatedAt
    }
    
    Messages {
        string id
        string type
        string content
        date timestamp
        object metadata
    }
    
    FormData ||--o{ KeyValueIndex : "generates"
    ChatHistory ||--o{ Messages : "contains"
    
    %% Indexes
    FormData {
        index createdAt_desc
        index originalFilename_text
    }
    
    KeyValueIndex {
        index key_extractedAt_desc
        index keyNormalized_1
        index documentId_1
    }
    
    ChatHistory {
        index sessionId_1
        index createdAt_desc
    }
```

## 🔄 Component Interaction Diagram

```mermaid
graph LR
    subgraph "Frontend Components"
        HomePage[HomePage]
        DocumentsList[DocumentsListPage]
        DocumentDetail[DocumentDetailPage]
        FileUpload[FileUpload]
        DocumentChat[DocumentChat]
        Navigation[Navigation]
        
        HomePage --> FileUpload
        DocumentsList --> DocumentChat
        DocumentsList --> DocumentDetail
    end
    
    subgraph "Backend Services"
        ExpressAPI[Express API]
        DocumentProcessor[Document Processor]
        AIService[AI Service]
        ChatService[Chat Service]
        KeyValueIndexService[KeyValue Index Service]
        
        DocumentProcessor --> AIService
        ChatService --> AIService
        DocumentProcessor --> KeyValueIndexService
    end
    
    subgraph "Data Layer"
        FormDataModel[FormData Model]
        KeyValueIndexModel[KeyValueIndex Model] 
        ChatHistoryModel[ChatHistory Model]
        
        KeyValueIndexService --> FormDataModel
        KeyValueIndexService --> KeyValueIndexModel
        ChatService --> ChatHistoryModel
    end
    
    %% Component to API connections
    FileUpload -.->|HTTP POST| ExpressAPI
    DocumentsList -.->|HTTP GET| ExpressAPI
    DocumentDetail -.->|HTTP GET| ExpressAPI
    DocumentChat -.->|HTTP POST| ExpressAPI
    
    %% API to Service connections
    ExpressAPI --> DocumentProcessor
    ExpressAPI --> ChatService
    ExpressAPI --> KeyValueIndexService
    
    %% Service to Model connections
    DocumentProcessor --> FormDataModel
    
    %% Styling
    classDef frontend fill:#e3f2fd
    classDef backend fill:#f1f8e9
    classDef data fill:#fce4ec
    
    class HomePage,DocumentsList,DocumentDetail,FileUpload,DocumentChat,Navigation frontend
    class ExpressAPI,DocumentProcessor,AIService,ChatService,KeyValueIndexService backend
    class FormDataModel,KeyValueIndexModel,ChatHistoryModel data
```

## 🚀 Deployment Architecture (Future State)

```mermaid
graph TB
    subgraph "Load Balancer Layer"
        LB[Load Balancer]
        SSL[SSL Termination]
        CDN[CDN/CloudFront]
        
        LB --> SSL
        SSL --> CDN
    end
    
    subgraph "Application Layer"
        App1[App Server 1]
        App2[App Server 2]
        App3[App Server 3]
        Queue[Background Queue]
        
        LB --> App1
        LB --> App2
        LB --> App3
        App1 --> Queue
        App2 --> Queue
        App3 --> Queue
    end
    
    subgraph "Data Layer"
        MongoDB[(MongoDB Cluster)]
        Redis[(Redis Cache)]
        S3[(Cloud Storage)]
        
        App1 --> MongoDB
        App1 --> Redis
        App1 --> S3
        App2 --> MongoDB
        App2 --> Redis
        App2 --> S3
        App3 --> MongoDB
        App3 --> Redis
        App3 --> S3
    end
    
    subgraph "External Services"
        GoogleAI[Google AI API]
        ClaudeAI[Claude AI API]
        Monitoring[Monitoring Services]
        
        App1 --> GoogleAI
        App1 --> ClaudeAI
        App1 --> Monitoring
    end
    
    subgraph "Monitoring & Logging"
        Logs[Log Aggregation]
        Metrics[Metrics Collection]
        Alerts[Alert Manager]
        
        App1 --> Logs
        App1 --> Metrics
        Metrics --> Alerts
    end
    
    %% User connections
    User[Users] --> LB
    
    %% Styling
    classDef loadbalancer fill:#e8eaf6
    classDef application fill:#e1f5fe
    classDef database fill:#f3e5f5
    classDef external fill:#f1f8e9
    classDef monitoring fill:#fff3e0
    
    class LB,SSL,CDN loadbalancer
    class App1,App2,App3,Queue application
    class MongoDB,Redis,S3 database
    class GoogleAI,ClaudeAI,Monitoring external
    class Logs,Metrics,Alerts monitoring
```

## 🔐 Security Architecture Diagram

```mermaid
graph TB
    subgraph "Security Layers"
        WAF[Web Application Firewall]
        RateLimit[Rate Limiting]
        Auth[Authentication Layer]
        AuthZ[Authorization Layer]
        Encryption[Data Encryption]
    end
    
    subgraph "Application Security"
        InputVal[Input Validation]
        FileVal[File Validation]
        SecHeaders[Security Headers]
        HTTPS[HTTPS/TLS]
    end
    
    subgraph "Data Security"
        EncryptRest[Encryption at Rest]
        EncryptTransit[Encryption in Transit]
        KeyMgmt[Key Management]
        Backup[Secure Backups]
    end
    
    subgraph "Monitoring Security"
        AuditLog[Audit Logging]
        SecurityMon[Security Monitoring]
        IncidentResp[Incident Response]
        VulnScan[Vulnerability Scanning]
    end
    
    %% Flow connections
    WAF --> RateLimit
    RateLimit --> Auth
    Auth --> AuthZ
    AuthZ --> InputVal
    InputVal --> FileVal
    
    HTTPS --> EncryptTransit
    EncryptRest --> KeyMgmt
    
    AuditLog --> SecurityMon
    SecurityMon --> IncidentResp
    
    %% Styling
    classDef security fill:#ffebee
    classDef application fill:#e8f5e8
    classDef data fill:#e3f2fd
    classDef monitoring fill:#fff3e0
    
    class WAF,RateLimit,Auth,AuthZ,Encryption security
    class InputVal,FileVal,SecHeaders,HTTPS application
    class EncryptRest,EncryptTransit,KeyMgmt,Backup data
    class AuditLog,SecurityMon,IncidentResp,VulnScan monitoring
```

---

*Diagram Version: 1.0*  
*Last Updated: January 2025*  
*Format: Mermaid.js*