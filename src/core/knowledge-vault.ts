/**
 * RepoPulse Knowledge Vault & Context Pinning Engine
 * Hybrid BM25 & Semantic Lexical Indexing for frontier AI maintainers.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface KnowledgeDocument {
  id: string;
  title: string;
  path: string;
  content: string;
  category: 'code' | 'diff' | 'doc' | 'schema' | 'config';
  tags?: string[];
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
  public indexDocument(doc: Omit<KnowledgeDocument, 'id' | 'tokensEstimated' | 'indexedAt'> & { id?: string }): KnowledgeDocument {
    const id = doc.id || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tokensEstimated = Math.ceil(doc.content.length / 4);
    const newDoc: KnowledgeDocument = {
      ...doc,
      id,
      tags: doc.tags || [],
      tokensEstimated,
      indexedAt: new Date().toISOString()
    };
    this.documents.set(id, newDoc);
    return newDoc;
  }

  /**
   * Index a local source or markdown file directly from the filesystem.
   */
  public indexFileFromDisk(filePath: string, category: KnowledgeDocument['category'] = 'doc'): KnowledgeDocument | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const content = fs.readFileSync(filePath, 'utf-8');
      const basename = path.basename(filePath);
      return this.indexDocument({
        title: basename,
        path: filePath,
        category,
        content,
        tags: [path.extname(filePath).replace('.', '')]
      });
    } catch {
      return null;
    }
  }

  /**
   * Hybrid BM25-style relevance search across titles, contents, and tags.
   */
  public search(query: string, limit: number = 5): SearchResult[] {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    if (terms.length === 0) return [];

    const totalDocs = this.documents.size || 1;
    const results: SearchResult[] = [];

    // Calculate document frequencies
    const docFreq: Record<string, number> = {};
    for (const term of terms) {
      docFreq[term] = 0;
      for (const doc of this.documents.values()) {
        if (doc.content.toLowerCase().includes(term) || doc.title.toLowerCase().includes(term)) {
          docFreq[term]++;
        }
      }
    }

    for (const doc of this.documents.values()) {
      const lowerContent = doc.content.toLowerCase();
      const lowerTitle = doc.title.toLowerCase();
      const tags = (doc.tags || []).map(t => t.toLowerCase());

      let score = 0;
      let matchedIndex = -1;

      for (const term of terms) {
        const idf = Math.log(1 + (totalDocs - (docFreq[term] || 0) + 0.5) / ((docFreq[term] || 0) + 0.5));
        let tf = 0;

        // Exact match in title (heavy weight)
        if (lowerTitle.includes(term)) {
          score += 15 * (1 + idf);
        }

        // Match in tags
        if (tags.some(t => t.includes(term))) {
          score += 10 * (1 + idf);
        }

        // Count term occurrences in content
        let pos = 0;
        while ((pos = lowerContent.indexOf(term, pos)) !== -1) {
          tf++;
          if (matchedIndex === -1) matchedIndex = pos;
          pos += term.length;
        }

        if (tf > 0) {
          // BM25 term frequency saturation
          const normTf = (tf * 2.2) / (tf + 1.2 * (1 - 0.75 + 0.75 * (doc.content.length / 500)));
          score += (normTf * idf) + 5;
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
          score: Math.round(score * 100) / 100,
          matchedSnippet: snippet
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  public getAll(): KnowledgeDocument[] {
    return Array.from(this.documents.values());
  }

  public getById(id: string): KnowledgeDocument | undefined {
    return this.documents.get(id);
  }

  public delete(id: string): boolean {
    return this.documents.delete(id);
  }

  public exportJson(): string {
    return JSON.stringify(Array.from(this.documents.values()), null, 2);
  }

  public importJson(json: string): number {
    try {
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) return 0;
      let count = 0;
      for (const item of arr) {
        if (item.title && item.content) {
          this.indexDocument(item);
          count++;
        }
      }
      return count;
    } catch {
      return 0;
    }
  }

  public clear(): void {
    this.documents.clear();
  }
}
