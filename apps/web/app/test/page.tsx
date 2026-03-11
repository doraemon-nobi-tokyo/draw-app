"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

export default function Page() {
  const { getToken, isSignedIn } = useAuth();
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [requestBody, setRequestBody] = useState("");
  const [responseBody, setResponseBody] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  async function copyLatestToken() {
    try {
      if (!isSignedIn) {
        setCopyStatus("Sign in first.");
        return;
      }

      let token = await getToken({ skipCache: true });
      if (!token) {
        setCopyStatus("No token available.");
        return;
      }

      token = "ws://localhost:8080?token="+ token

      await navigator.clipboard.writeText(token);
      setCopyStatus("Latest token copied.");
    } catch (e) {
      console.log(e);
      setCopyStatus("Failed to copy token.");
    }
  }

  async function sendRequest() {
    try {
      if (!isSignedIn) {
        setResponseBody("Sign in first so the test page can send a Clerk token.");
        return;
      }

      const token = await getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method,
        headers,
        body: method === "GET" ? undefined : requestBody,
      });

      const text = await res.text();
      setResponseBody(text);
    } catch (e) {
      console.log(e);
      setResponseBody("Request failed. Check the console for details.");
    }
  }

  return (
    <div className="p-4 space-y-4">
      <input
        className="border p-2 w-full"
        type="text"
        placeholder="Enter URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <select
        className="border p-2"
        value={method}
        onChange={(e) => setMethod(e.target.value)}
      >
        <option>GET</option>
        <option>POST</option>
        <option>PUT</option>
        <option>DELETE</option>
      </select>

      <textarea
        className="border p-2 w-full h-32"
        placeholder='{"slug":"room1"}'
        value={requestBody}
        onChange={(e) => setRequestBody(e.target.value)}
      />

      <button
        className="border px-4 py-2"
        onClick={sendRequest}
      >
        Send
      </button>

      <div className="space-y-2">
        <button
          className="border px-4 py-2"
          onClick={copyLatestToken}
          type="button"
        >
          Copy latest token
        </button>

        {copyStatus ? (
          <p className="text-sm text-gray-600">{copyStatus}</p>
        ) : null}
      </div>

      <pre className="border p-2 whitespace-pre-wrap">
        {responseBody}
      </pre>
    </div>
  );
}
