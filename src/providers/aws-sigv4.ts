/**
 * Zero-Dependency AWS Signature Version 4 (SigV4) Signer
 * High-performance cryptographic signing using native Node.js crypto.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import * as crypto from 'node:crypto';

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region?: string;
}

export interface SigV4SignOptions {
  method: string;
  url: string;
  service: string;
  region: string;
  headers?: Record<string, string>;
  body?: string;
  credentials: AwsCredentials;
  timestamp?: Date;
}

export interface SignedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmac(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

export class AwsSigV4Signer {
  /**
   * Signs an HTTP request according to the AWS Signature Version 4 specification.
   */
  public static sign(options: SigV4SignOptions): SignedRequest {
    const {
      method,
      url: rawUrl,
      service,
      region,
      body = '',
      credentials,
      timestamp = new Date()
    } = options;

    const urlObj = new URL(rawUrl);
    const host = urlObj.host;
    const pathname = urlObj.pathname || '/';

    const amzDate = timestamp.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const payloadHash = sha256(body);

    const headersToSign: Record<string, string> = {
      'host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      ...(options.headers || {})
    };

    if (credentials.sessionToken) {
      headersToSign['x-amz-security-token'] = credentials.sessionToken;
    }

    // Sort lowercase headers for canonical header calculation
    const sortedHeaderKeys = Object.keys(headersToSign)
      .map(k => k.toLowerCase())
      .sort();

    const canonicalHeaders = sortedHeaderKeys
      .map(k => `${k}:${headersToSign[k].trim()}\n`)
      .join('');

    const signedHeaders = sortedHeaderKeys.join(';');

    // Canonical query string (sorted)
    const searchParams = new URLSearchParams(urlObj.search);
    const sortedQueryEntries = Array.from(searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
    const canonicalQueryString = sortedQueryEntries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const canonicalRequest = [
      method.toUpperCase(),
      pathname,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256(canonicalRequest)
    ].join('\n');

    // Calculate derived signing key
    const kDate = hmac('AWS4' + credentials.secretAccessKey, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, 'aws4_request');

    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const finalHeaders: Record<string, string> = {
      ...headersToSign,
      'authorization': authorizationHeader
    };

    return {
      url: rawUrl,
      method: method.toUpperCase(),
      headers: finalHeaders,
      body: body || undefined
    };
  }
}
