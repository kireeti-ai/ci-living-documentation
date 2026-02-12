import React from "react";
import ReactMarkdown from "react-markdown";

export default function DocumentationPanel({ docs }) {
  if (!docs) return null;

  return (
    <div className="space-y-10">

      {/* README */}
      <section className="bg-zinc-900 p-6 rounded-2xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4">README</h2>
        <ReactMarkdown className="prose prose-invert max-w-none">
          {docs.readme}
        </ReactMarkdown>
      </section>

      {/* API Docs */}
      <section className="bg-zinc-900 p-6 rounded-2xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4">API Documentation</h2>
        <ReactMarkdown className="prose prose-invert max-w-none">
          {docs.api_docs}
        </ReactMarkdown>
      </section>

      {/* ADR */}
      {docs.adr && docs.adr.length > 0 && (
        <section className="bg-zinc-900 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4">
            Architecture Decision Records
          </h2>

          <div className="space-y-6">
            {docs.adr.map((item, index) => (
              <div key={index} className="border border-zinc-700 p-4 rounded-xl">
                <h3 className="text-lg font-medium">{item.title}</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Status: {item.status}
                </p>
                <p className="mt-3 text-zinc-300">{item.decision}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Architecture Diagram */}
      {docs.architecture_diagrams && (
        <section className="bg-zinc-900 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4">
            Architecture Diagram
          </h2>

          {docs.architecture_diagrams.image_url && (
            <img
              src={docs.architecture_diagrams.image_url}
              alt="Architecture Diagram"
              className="rounded-xl border border-zinc-700"
            />
          )}

          {docs.architecture_diagrams.mermaid && (
            <pre className="bg-black p-4 rounded-xl text-sm overflow-auto mt-4">
              {docs.architecture_diagrams.mermaid}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}
