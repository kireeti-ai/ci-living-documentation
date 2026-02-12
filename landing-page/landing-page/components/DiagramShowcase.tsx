import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Database, Network, GitBranch, FileText, BookOpen,
    Code2, Eye, Copy, Check, ChevronRight, Layers,
    ArrowRight, Maximize2, X
} from 'lucide-react'
import mermaid from 'mermaid'
import { marked } from 'marked'

// ─── Mermaid initialization ───────────────────────────────────────────────────
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
        darkMode: true,
        primaryColor: '#58a6ff',
        primaryTextColor: '#e6edf3',
        primaryBorderColor: '#30363d',
        lineColor: '#8b949e',
        secondaryColor: '#238636',
        tertiaryColor: '#161b22',
        noteTextColor: '#e6edf3',
        noteBkgColor: '#161b22',
        noteBorderColor: '#30363d',
        mainBkg: '#0d1117',
        nodeBkg: '#161b22',
        nodeBorder: '#30363d',
        clusterBkg: '#161b22',
        clusterBorder: '#30363d',
        titleColor: '#e6edf3',
        edgeLabelBackground: '#0d1117',
        background: '#0d1117',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: '13px',
    },
    flowchart: { curve: 'basis', padding: 20 },
    er: { fontSize: 11, useMaxWidth: true },
    sequence: { useMaxWidth: true, actorFontSize: 12, messageFontSize: 12 },
})

// ─── Demo Project Files ───────────────────────────────────────────────────────
// Using a fictional "ShopStream" e-commerce project for maximum relevance to SWEs

interface DemoFile {
    id: string
    name: string
    type: 'mermaid' | 'markdown'
    icon: React.ReactNode
    iconColor: string
    label: string
    code: string
}

const demoFiles: DemoFile[] = [
    {
        id: 'er-diagram',
        name: 'schema.mmd',
        type: 'mermaid',
        icon: <Database size={14} />,
        iconColor: 'var(--accent-orange)',
        label: 'ER Diagram',
        code: `erDiagram
    USERS {
        uuid id PK
        string email UK
        string username
        string password_hash
        timestamp created_at
        enum role
    }
    PRODUCTS {
        uuid id PK
        string title
        text description
        decimal price
        int stock_count
        uuid category_id FK
        jsonb metadata
    }
    ORDERS {
        uuid id PK
        uuid user_id FK
        decimal total_amount
        enum status
        timestamp placed_at
        timestamp shipped_at
    }
    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
    }
    PAYMENTS {
        uuid id PK
        uuid order_id FK
        decimal amount
        enum method
        enum status
        string transaction_id
        timestamp processed_at
    }
    CATEGORIES {
        uuid id PK
        string name
        string slug
        uuid parent_id FK
    }
    REVIEWS {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        int rating
        text comment
        timestamp created_at
    }

    USERS ||--o{ ORDERS : places
    USERS ||--o{ REVIEWS : writes
    ORDERS ||--|{ ORDER_ITEMS : contains
    ORDER_ITEMS }o--|| PRODUCTS : references
    ORDERS ||--o| PAYMENTS : "paid via"
    PRODUCTS }o--|| CATEGORIES : "belongs to"
    PRODUCTS ||--o{ REVIEWS : receives
    CATEGORIES ||--o{ CATEGORIES : "parent of"`,
    },
    {
        id: 'architecture',
        name: 'system.mmd',
        type: 'mermaid',
        icon: <Network size={14} />,
        iconColor: 'var(--accent-blue)',
        label: 'Architecture',
        code: `graph TB
    subgraph Client["🖥️ Client Layer"]
        WEB["React SPA"]
        MOB["Mobile App"]
    end

    subgraph Gateway["🔀 API Gateway"]
        NGINX["Nginx Reverse Proxy"]
        AUTH["Auth Middleware"]
        RATE["Rate Limiter"]
    end

    subgraph Services["⚙️ Microservices"]
        USER_SVC["User Service<br/>Node.js"]
        PRODUCT_SVC["Product Service<br/>Python"]
        ORDER_SVC["Order Service<br/>Go"]
        PAYMENT_SVC["Payment Service<br/>Java"]
        NOTIFY_SVC["Notification Service<br/>Node.js"]
        SEARCH_SVC["Search Service<br/>Python"]
    end

    subgraph Data["💾 Data Layer"]
        PG[("PostgreSQL<br/>Primary DB")]
        REDIS[("Redis<br/>Cache")]
        ES[("Elasticsearch<br/>Full-text")]
        S3["S3 Bucket<br/>Assets"]
    end

    subgraph Infra["📊 Observability"]
        PROM["Prometheus"]
        GRAF["Grafana"]
        JAEG["Jaeger Tracing"]
    end

    WEB --> NGINX
    MOB --> NGINX
    NGINX --> AUTH --> RATE
    RATE --> USER_SVC & PRODUCT_SVC & ORDER_SVC & PAYMENT_SVC
    ORDER_SVC --> NOTIFY_SVC
    PRODUCT_SVC --> SEARCH_SVC
    USER_SVC & ORDER_SVC & PAYMENT_SVC --> PG
    PRODUCT_SVC --> PG & REDIS
    SEARCH_SVC --> ES
    PRODUCT_SVC --> S3
    USER_SVC & PRODUCT_SVC & ORDER_SVC --> PROM --> GRAF
    ORDER_SVC --> JAEG`,
    },
    {
        id: 'sequence',
        name: 'checkout-flow.mmd',
        type: 'mermaid',
        icon: <GitBranch size={14} />,
        iconColor: 'var(--accent-green)',
        label: 'Sequence',
        code: `sequenceDiagram
    autonumber
    actor Customer
    participant Web as React Frontend
    participant GW as API Gateway
    participant Auth as Auth Service
    participant Cart as Cart Service
    participant Order as Order Service
    participant Pay as Payment Service
    participant Notify as Notification

    Customer->>Web: Click "Checkout"
    Web->>GW: POST /api/checkout
    GW->>Auth: Validate JWT Token
    Auth-->>GW: ✅ Token Valid

    GW->>Cart: GET /cart/{userId}
    Cart-->>GW: Cart Items + Totals

    GW->>Order: POST /orders
    Note over Order: Create order record<br/>Status: PENDING

    Order->>Pay: POST /payments/charge
    Pay->>Pay: Process via Stripe
    alt Payment Success
        Pay-->>Order: ✅ Payment Confirmed
        Order->>Order: Status → CONFIRMED
        Order->>Notify: Emit OrderConfirmed
        Notify->>Customer: 📧 Email Confirmation
        Notify->>Customer: 📱 Push Notification
        Order-->>GW: 201 Order Created
        GW-->>Web: Order Confirmation
        Web-->>Customer: Show Success Page
    else Payment Failed
        Pay-->>Order: ❌ Payment Declined
        Order->>Order: Status → FAILED
        Order-->>GW: 402 Payment Required
        GW-->>Web: Error Response
        Web-->>Customer: Show Retry Option
    end`,
    },
    {
        id: 'class-diagram',
        name: 'domain-models.mmd',
        type: 'mermaid',
        icon: <Layers size={14} />,
        iconColor: 'var(--accent-purple)',
        label: 'Class Diagram',
        code: `classDiagram
    class User {
        +UUID id
        +String email
        +String username
        -String passwordHash
        +Role role
        +DateTime createdAt
        +register() User
        +authenticate(password) Boolean
        +updateProfile(data) User
    }

    class Product {
        +UUID id
        +String title
        +String description
        +Decimal price
        +Int stockCount
        +Category category
        +isAvailable() Boolean
        +updateStock(qty) void
        +toSearchIndex() Object
    }

    class Order {
        +UUID id
        +User customer
        +List~OrderItem~ items
        +Decimal totalAmount
        +OrderStatus status
        +DateTime placedAt
        +calculateTotal() Decimal
        +cancel() void
        +markShipped() void
    }

    class OrderItem {
        +UUID id
        +Product product
        +Int quantity
        +Decimal unitPrice
        +subtotal() Decimal
    }

    class Payment {
        +UUID id
        +Order order
        +Decimal amount
        +PaymentMethod method
        +PaymentStatus status
        +process() Boolean
        +refund() Boolean
    }

    class CartService {
        +getCart(userId) Cart
        +addItem(productId, qty) Cart
        +removeItem(productId) Cart
        +checkout(userId) Order
    }

    User "1" --> "*" Order : places
    Order "1" --> "*" OrderItem : contains
    OrderItem "*" --> "1" Product : references
    Order "1" --> "0..1" Payment : paid via
    CartService ..> Order : creates
    CartService ..> Product : validates`,
    },
    {
        id: 'readme',
        name: 'README.md',
        type: 'markdown',
        icon: <BookOpen size={14} />,
        iconColor: 'var(--accent-cyan)',
        label: 'README',
        code: `# 🛍️ ShopStream — E-Commerce Platform

[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-96%25-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Docker](https://img.shields.io/badge/docker-ready-blue)]()

> A production-grade microservices e-commerce platform built with modern cloud-native patterns.

## 🏗️ Architecture Overview

ShopStream is composed of **6 independent microservices**, each owning its domain logic and data:

| Service | Stack | Port | Description |
|---------|-------|------|-------------|
| User Service | Node.js + Express | 3001 | Authentication, profiles, RBAC |
| Product Service | Python + FastAPI | 3002 | Catalog, search, inventory |
| Order Service | Go + Gin | 3003 | Orders, cart, checkout flow |
| Payment Service | Java + Spring | 3004 | Stripe integration, refunds |
| Notification | Node.js + Bull | 3005 | Email, SMS, push notifications |
| Search Service | Python + FastAPI | 3006 | Elasticsearch-powered search |

## 🚀 Quick Start

\`\`\`bash
# Clone and start all services
git clone https://github.com/shopstream/platform.git
cd platform

# Start infrastructure
docker-compose up -d postgres redis elasticsearch

# Start all services
make dev

# Run migrations
make migrate

# Seed demo data
make seed
\`\`\`

## 📊 API Endpoints

\`\`\`
POST   /api/auth/register     Register new user
POST   /api/auth/login        Authenticate user
GET    /api/products           List products
GET    /api/products/:id       Get product details
POST   /api/orders             Create order
POST   /api/payments/charge    Process payment
GET    /api/orders/:id/track   Track order status
\`\`\`

## 🧪 Testing

\`\`\`bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run coverage
\`\`\`

---
*Auto-generated by CI Living Documentation • Last updated: 2 minutes ago*`,
    },
    {
        id: 'api-reference',
        name: 'api-reference.md',
        type: 'markdown',
        icon: <FileText size={14} />,
        iconColor: 'var(--accent-pink)',
        label: 'API Docs',
        code: `# 📡 ShopStream API Reference

## Authentication

### POST \`/api/auth/register\`

Register a new user account.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "securePassword123!"
}
\`\`\`

**Response:** \`201 Created\`
\`\`\`json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "username": "john_doe",
  "token": "eyJhbGciOiJIUz...",
  "expiresIn": 3600
}
\`\`\`

---

### POST \`/api/auth/login\`

Authenticate and receive a JWT token.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",  
  "password": "securePassword123!"
}
\`\`\`

---

## Products

### GET \`/api/products\`

List all products with pagination.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number |
| limit | int | 20 | Items per page |
| category | string | — | Filter by category |
| sort | string | created_at | Sort field |
| q | string | — | Search query |

**Response:** \`200 OK\`
\`\`\`json
{
  "data": [
    {
      "id": "prod_001",
      "title": "Wireless Headphones",
      "price": 79.99,
      "stock": 142,
      "rating": 4.5,
      "category": "Electronics"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1284,
    "pages": 65
  }
}
\`\`\`

---

## Orders

### POST \`/api/orders\`

Create a new order from the user's cart.

**Headers:** \`Authorization: Bearer <token>\`

**Request Body:**
\`\`\`json
{
  "items": [
    { "productId": "prod_001", "quantity": 2 },
    { "productId": "prod_042", "quantity": 1 }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105"
  }
}
\`\`\`

---

*Auto-generated from OpenAPI spec • ShopStream v2.1.0*`,
    },
]

// ─── Syntax Highlighting (basic Mermaid) ──────────────────────────────────────
function highlightMermaid(code: string): string {
    const lines = code.split('\n')
    return lines
        .map((line) => {
            // First, HTML-escape the line
            const escaped = line
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')

            // Collect all match ranges with their colors
            interface MatchRange { start: number; end: number; color: string; style?: string }
            const matches: MatchRange[] = []

            const addMatches = (regex: RegExp, color: string, style?: string) => {
                let m
                while ((m = regex.exec(escaped)) !== null) {
                    matches.push({ start: m.index, end: m.index + m[0].length, color, style })
                }
            }

            // Keywords
            addMatches(/\b(erDiagram|graph|sequenceDiagram|classDiagram|flowchart|subgraph|end|participant|actor|Note over|alt|else|autonumber|TB|LR|TD|RL|PK|FK|UK)\b/g, '#ff7b72')
            // Strings (quoted)
            addMatches(/"([^"]*)"/g, '#a5d6ff')
            // Types
            addMatches(/\b(string|int|uuid|text|decimal|timestamp|enum|jsonb|Boolean|Decimal|DateTime|String|UUID|Int|void|Object|List)\b/g, '#d2a8ff')
            // Relationships
            addMatches(/(\|\|--|--o\{|\|\|--o\||}o--\|\||\|\|--\|{|\.\.\&gt;|--\&gt;|--\&gt;\&gt;|--\))/g, '#79c0ff')
            // Comments
            addMatches(/(%%.*)$/g, '#8b949e', 'font-style:italic')

            // Sort by start position
            matches.sort((a, b) => a.start - b.start)

            // Remove overlapping matches (keep first/earliest)
            const filtered: MatchRange[] = []
            let lastEnd = 0
            for (const m of matches) {
                if (m.start >= lastEnd) {
                    filtered.push(m)
                    lastEnd = m.end
                }
            }

            // Build final HTML in a single pass
            let result = ''
            let pos = 0
            for (const m of filtered) {
                result += escaped.slice(pos, m.start)
                const styleAttr = m.style ? `color:${m.color};${m.style}` : `color:${m.color}`
                result += `<span style="${styleAttr}">${escaped.slice(m.start, m.end)}</span>`
                pos = m.end
            }
            result += escaped.slice(pos)

            return result
        })
        .join('\n')
}

function highlightMarkdown(code: string): string {
    const lines = code.split('\n')
    return lines
        .map((line) => {
            let processed = line
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')

            // Headers
            if (/^#{1,6}\s/.test(line)) {
                processed = `<span style="color:#ff7b72;font-weight:bold">${processed}</span>`
            }
            // Bold
            processed = processed.replace(
                /\*\*([^*]+)\*\*/g,
                '<span style="color:#e6edf3;font-weight:bold">**$1**</span>'
            )
            // Inline code
            processed = processed.replace(
                /`([^`]+)`/g,
                '<span style="color:#a5d6ff;background:rgba(110,118,129,0.1);padding:0 4px;border-radius:3px">`$1`</span>'
            )
            // Links / badges
            processed = processed.replace(
                /\[([^\]]+)\]\(([^)]+)\)/g,
                '<span style="color:#58a6ff">[$1]($2)</span>'
            )
            // Table separators
            if (/^\|[-|:\s]+\|$/.test(line.trim())) {
                processed = `<span style="color:#30363d">${processed}</span>`
            }
            // Blockquotes
            if (/^&gt;/.test(processed)) {
                processed = `<span style="color:#8b949e;font-style:italic">${processed}</span>`
            }
            // List items
            if (/^\s*[-*]\s/.test(line)) {
                processed = processed.replace(/^(\s*)([-*])/, '$1<span style="color:#ff7b72">$2</span>')
            }

            return processed
        })
        .join('\n')
}

// ─── Code Editor Panel ────────────────────────────────────────────────────────
function CodeEditor({ code, type }: { code: string; type: 'mermaid' | 'markdown' }) {
    const [copied, setCopied] = useState(false)
    const lines = code.split('\n')

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [code])

    const highlighted = type === 'mermaid' ? highlightMermaid(code) : highlightMarkdown(code)

    return (
        <div className="flex flex-col h-full rounded-lg overflow-hidden" style={{ background: '#0d1117', border: '1px solid var(--border-default)' }}>
            {/* Editor top bar */}
            <div
                className="flex items-center justify-between px-4 py-2 shrink-0"
                style={{ background: '#161b22', borderBottom: '1px solid var(--border-muted)' }}
            >
                <div className="flex items-center gap-2">
                    <Code2 size={12} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Source Code
                    </span>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-md transition-all"
                    style={{
                        color: copied ? 'var(--accent-green)' : 'var(--text-muted)',
                        background: copied ? 'rgba(63,185,80,0.08)' : 'transparent',
                        border: `1px solid ${copied ? 'rgba(63,185,80,0.2)' : 'var(--border-muted)'}`,
                    }}
                >
                    {copied ? <Check size={10} /> : <Copy size={10} />}
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>

            {/* Code content */}
            <div className="flex-1 overflow-auto p-0" style={{ maxHeight: '500px' }}>
                <div className="flex">
                    {/* Line numbers */}
                    <div
                        className="shrink-0 pr-3 pl-4 py-3 text-right select-none"
                        style={{ color: '#484f58', fontSize: '12px', lineHeight: '20px', fontFamily: '"JetBrains Mono", "Fira Code", monospace', borderRight: '1px solid #21262d' }}
                    >
                        {lines.map((_, i) => (
                            <div key={i}>{i + 1}</div>
                        ))}
                    </div>
                    {/* Code */}
                    <pre
                        className="flex-1 py-3 pl-4 pr-4"
                        style={{
                            fontSize: '12px',
                            lineHeight: '20px',
                            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                            color: '#e6edf3',
                            margin: 0,
                            whiteSpace: 'pre',
                            overflowX: 'auto',
                        }}
                        dangerouslySetInnerHTML={{ __html: highlighted }}
                    />
                </div>
            </div>
        </div>
    )
}

// ─── Mermaid Renderer ─────────────────────────────────────────────────────────
function MermaidPreview({ code, fileId }: { code: string; fileId: string }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true
        setLoading(true)
        setError(null)

        const renderDiagram = async () => {
            try {
                const id = `mermaid-${fileId}-${Date.now()}`
                const { svg } = await mermaid.render(id, code)
                if (isMounted && containerRef.current) {
                    containerRef.current.innerHTML = svg
                    // Style the SVG to fill the container
                    const svgEl = containerRef.current.querySelector('svg')
                    if (svgEl) {
                        svgEl.style.maxWidth = '100%'
                        svgEl.style.height = 'auto'
                        svgEl.style.maxHeight = '500px'
                    }
                    setLoading(false)
                }
            } catch (e) {
                if (isMounted) {
                    setError(e instanceof Error ? e.message : 'Render failed')
                    setLoading(false)
                }
            }
        }

        renderDiagram()
        return () => { isMounted = false }
    }, [code, fileId])

    return (
        <div className="flex flex-col h-full rounded-lg overflow-hidden" style={{ background: '#0d1117', border: '1px solid var(--border-default)' }}>
            <div
                className="flex items-center gap-2 px-4 py-2 shrink-0"
                style={{ background: '#161b22', borderBottom: '1px solid var(--border-muted)' }}
            >
                <Eye size={12} style={{ color: 'var(--text-muted)' }} />
                <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Rendered Preview
                </span>
                <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(63,185,80,0.08)', color: 'var(--accent-green)', border: '1px solid rgba(63,185,80,0.15)' }}>
                    LIVE
                </span>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-6" style={{ maxHeight: '500px' }}>
                {loading && (
                    <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
                        Rendering diagram...
                    </div>
                )}
                {error && (
                    <div className="text-[12px] font-mono p-3 rounded" style={{ color: 'var(--accent-red)', background: 'rgba(248,81,73,0.06)' }}>
                        Error: {error}
                    </div>
                )}
                <div ref={containerRef} className="w-full flex items-center justify-center" />
            </div>
        </div>
    )
}

// ─── Markdown Preview ─────────────────────────────────────────────────────────
function MarkdownPreview({ code }: { code: string }) {
    const [html, setHtml] = useState('')

    useEffect(() => {
        const render = async () => {
            const result = await marked(code, { gfm: true, breaks: true })
            setHtml(result)
        }
        render()
    }, [code])

    return (
        <div className="flex flex-col h-full rounded-lg overflow-hidden" style={{ background: '#0d1117', border: '1px solid var(--border-default)' }}>
            <div
                className="flex items-center gap-2 px-4 py-2 shrink-0"
                style={{ background: '#161b22', borderBottom: '1px solid var(--border-muted)' }}
            >
                <Eye size={12} style={{ color: 'var(--text-muted)' }} />
                <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Rendered Preview
                </span>
                <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(63,185,80,0.08)', color: 'var(--accent-green)', border: '1px solid rgba(63,185,80,0.15)' }}>
                    LIVE
                </span>
            </div>
            <div
                className="flex-1 overflow-auto p-6 markdown-preview"
                style={{ maxHeight: '500px' }}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </div>
    )
}

// ─── Fullscreen Modal ─────────────────────────────────────────────────────────
function FullscreenModal({ file, onClose }: { file: DemoFile; onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
            style={{ background: 'rgba(1, 4, 9, 0.9)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-[95vw] max-h-[90vh] overflow-hidden rounded-xl"
                style={{ background: 'var(--bg-default)', border: '1px solid var(--border-default)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal header */}
                <div className="flex items-center justify-between px-5 py-3" style={{ background: '#161b22', borderBottom: '1px solid var(--border-muted)' }}>
                    <div className="flex items-center gap-3">
                        <span style={{ color: file.iconColor }}>{file.icon}</span>
                        <span className="text-[13px] font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-muted)' }}>
                            {file.type}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        <X size={16} />
                    </button>
                </div>
                {/* Split pane */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden" style={{ maxHeight: 'calc(90vh - 52px)' }}>
                    <div className="overflow-auto" style={{ borderRight: '1px solid var(--border-muted)' }}>
                        <CodeEditor code={file.code} type={file.type} />
                    </div>
                    <div className="overflow-auto">
                        {file.type === 'mermaid' ? (
                            <MermaidPreview code={file.code} fileId={`modal-${file.id}`} />
                        ) : (
                            <MarkdownPreview code={file.code} />
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DiagramShowcase() {
    const [activeFile, setActiveFile] = useState<string>(demoFiles[0].id)
    const [fullscreenFile, setFullscreenFile] = useState<DemoFile | null>(null)
    const currentFile = demoFiles.find((f) => f.id === activeFile) || demoFiles[0]

    return (
        <section id="diagram-showcase" className="section-padding relative">
            <hr className="section-divider" />

            <div className="section-container pt-20">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <span className="gh-badge mb-6 py-1.5 px-3">
                        <Code2 size={14} style={{ color: 'var(--accent-cyan)' }} />
                        Live Diagram Preview
                    </span>
                    <h2
                        className="text-[36px] md:text-[48px] font-bold tracking-[-0.02em] mt-6 mb-6"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        Code → Diagram, Instantly
                    </h2>
                    <p
                        className="text-[16px] md:text-[18px] max-w-[680px] mx-auto leading-relaxed mb-4"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        See how documentation artifacts are auto-generated from your codebase.
                        Explore ER diagrams, architecture maps, sequence flows, and more — all rendered live from Mermaid and Markdown.
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4 text-[12px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        <span className="px-2 py-0.5 rounded-md" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-muted)' }}>
                            Demo Project: ShopStream E-Commerce
                        </span>
                    </div>
                </motion.div>

                {/* Tab Bar — file selector */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="mb-6"
                >
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 px-1 rounded-lg" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-muted)' }}>
                        {demoFiles.map((file) => (
                            <button
                                key={file.id}
                                onClick={() => setActiveFile(file.id)}
                                className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-all rounded-md whitespace-nowrap shrink-0"
                                style={{
                                    color: activeFile === file.id ? 'var(--text-primary)' : 'var(--text-muted)',
                                    background: activeFile === file.id ? 'var(--bg-default)' : 'transparent',
                                    boxShadow: activeFile === file.id ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                                    border: activeFile === file.id ? '1px solid var(--border-default)' : '1px solid transparent',
                                }}
                            >
                                <span style={{ color: file.iconColor }}>{file.icon}</span>
                                <span className="hidden sm:inline">{file.name}</span>
                                <span className="sm:hidden">{file.label}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Split Pane: Editor + Preview */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeFile}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <CodeEditor code={currentFile.code} type={currentFile.type} />
                            {currentFile.type === 'mermaid' ? (
                                <MermaidPreview code={currentFile.code} fileId={currentFile.id} />
                            ) : (
                                <MarkdownPreview code={currentFile.code} />
                            )}
                        </div>

                        {/* Bottom bar */}
                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-green)', animation: 'pulse-dot 2s infinite' }} />
                                    Auto-generated from source
                                </span>
                                <span>{currentFile.code.split('\n').length} lines</span>
                                <span className="flex items-center gap-1">
                                    <ChevronRight size={10} />
                                    {currentFile.name}
                                </span>
                            </div>
                            <button
                                onClick={() => setFullscreenFile(currentFile)}
                                className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-md transition-all"
                                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-muted)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                            >
                                <Maximize2 size={11} />
                                Fullscreen
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation hint */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="mt-10 text-center"
                >
                    <p className="text-[13px] flex items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <ArrowRight size={14} />
                        Switch between tabs to explore all auto-generated documentation artifacts
                    </p>
                </motion.div>
            </div>

            {/* Fullscreen modal */}
            <AnimatePresence>
                {fullscreenFile && (
                    <FullscreenModal file={fullscreenFile} onClose={() => setFullscreenFile(null)} />
                )}
            </AnimatePresence>
        </section>
    )
}
