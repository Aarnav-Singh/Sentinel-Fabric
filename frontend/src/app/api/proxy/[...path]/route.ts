import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
    return handleProxyRequest(request, params.path);
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
    return handleProxyRequest(request, params.path);
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
    return handleProxyRequest(request, params.path);
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
    return handleProxyRequest(request, params.path);
}

async function handleProxyRequest(request: NextRequest, pathArray: string[]) {
    try {
        const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8000";
        const apiKey = process.env.BACKEND_API_KEY;

        if (!apiKey) {
            console.error("[Proxy] ERROR: BACKEND_API_KEY is not set.");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        const pathString = pathArray.join("/");
        const searchParams = request.nextUrl.searchParams.toString();
        const query = searchParams ? `?${searchParams}` : "";

        const targetUrl = `${backendUrl}/${pathString}${query}`;

        const headers = new Headers();
        const clientAuth = request.headers.get("Authorization");
        if (clientAuth) {
            headers.set("Authorization", clientAuth);
        } else {
            headers.set("Authorization", `Bearer ${apiKey}`);
        }
        headers.set("x-api-key", apiKey);

        // Pass along content type if we have a body
        const reqContentType = request.headers.get("Content-Type");
        if (reqContentType) {
            headers.set("Content-Type", reqContentType);
        } else if (request.method !== "GET" && request.method !== "HEAD") {
            headers.set("Content-Type", "application/json");
        }

        const reqInit: RequestInit = {
            method: request.method,
            headers,
        };

        if (request.method !== "GET" && request.method !== "HEAD") {
            reqInit.body = await request.text();
        }

        const response = await fetch(targetUrl, reqInit);

        const text = await response.text();
        if (!response.ok) {
            console.error(`[Proxy] HTTP ${response.status} from backend ${targetUrl}:`, text);
        }
        let body;
        try {
            body = JSON.parse(text);
        } catch {
            body = text;
        }

        return NextResponse.json(body, { status: response.status });
    } catch (error) {
        console.error("[Proxy] Error routing request:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
