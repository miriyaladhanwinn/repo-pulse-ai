/**
 * RepoPulse Knowledge Vault & Context Pinning Engine
 * Lightweight in-memory and file-backed semantic snippet indexing for AI agents.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

export interface KnowledgeDocument {
  id: string;
  title: string;
  path: string;
  content: string;
  category: 'code' | 'diff' | 'doc' | 'schema';
  tokensEstimated: number;
  indexedAt: string;
}

export interface SearchResult {
  doc: KnowledgeDocument;
  score: number;
  matchedSnippet: string;
}

export class KnowledgeVault {
  private documents: Map<string, KnowledgeDocument> = new Map();

  /**
   * Index or update a document in the vault.
   */
  public indexDocument(doc: Omit<KnowledgeDocument, 'id' | 'tokensEstimated' | 'indexedAt'>): KnowledgeDocument {
    const id = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tokensEstimated = Math.ceil(doc.content.length / 4);
    const newDoc: KnowledgeDocument = {
      ...doc,
      id,
      tokensEstimated,
      indexedAt: new Date().toISOString()
    };
    this.documents.set(id, newDoc);
    return newDoc;
  }

  /**
   * Search documents using keyword and symbol matching.
   */
  public search(query: string, limit: number = 5): SearchResult[] {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    if (terms.length === 0) return [];

    const results: SearchResult[] = [];

    for (const doc of this.documents.values()) {
      const lowerContent = doc.content.toLowerCase();
      const lowerTitle = doc.title.toLowerCase();

      let score = 0;
      let matchedIndex = -1;

      for (const term of terms) {
        if (lowerTitle.includes(term)) score += 10;
        const idx = lowerContent.indexOf(term);
        if (idx !== -1) {
          score += 5;
          if (matchedIndex === -1) matchedIndex = idx;
        }
      }

      if (score > 0) {
        let snippet = '';
        if (matchedIndex !== -1) {
          const start = Math.max(0, matchedIndex - 60);
          const end = Math.min(doc.content.length, matchedIndex + 140);
          snippet = `...${doc.content.substring(start, end).replace(/\n+/g, ' ')}...`;
        } else {
          snippet = `[${doc.title}] ${doc.content.substring(0, 140).replace(/\n+/g, ' ')}`;
        }

        results.push({
          doc,
          score,
          matchedSnippet: snippet
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  public getAll(): KnowledgeDocument[] {
    return Array.from(this.documents.values());
  }

  public delete(id: string): boolean {
    return this.documents.delete(id);
  }

  public clear(): void {
    this.documents.clear();
  }
}
