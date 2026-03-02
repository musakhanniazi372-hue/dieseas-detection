import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Protect Admin Routes (Anything under /admin except /admin/login)
    if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
        const adminAuth = request.cookies.get("admin_auth");
        if (adminAuth?.value !== "authenticated") {
            return NextResponse.redirect(new URL("/admin/login", request.url));
        }
    }

    // Protect Dashboard Routes (User)
    if (pathname.startsWith("/dashboard")) {
        const userId = request.cookies.get("id");
        if (!userId) {
            return NextResponse.redirect(new URL("/signin", request.url));
        }
    }

    return NextResponse.next();
}

// Config to specify which paths this middleware applies to
export const config = {
    matcher: [
        "/admin/:path*",
        "/dashboard/:path*",
        "/dashboard",
        "/admin",
    ],
};
