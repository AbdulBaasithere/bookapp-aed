import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Initialize GoogleGenAI client with the key from environment variables
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper to map object keys from camelCase to snake_case
function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnakeCase(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result: any, key) => {
      let value = obj[key];
      if (key === 'workingHours') {
        value = value; // JSONB is handled natively in pg/supabase, keep as object
      }
      const snake = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snake] = value;
      return result;
    }, {});
  }
  return obj;
}

// Helper to map object keys from snake_case to camelCase
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result: any, key) => {
      let value = obj[key];
      if (key === 'working_hours') {
        try {
          if (typeof value === 'string') {
            value = JSON.parse(value);
          }
        } catch (e) {
          // ignore
        }
      }
      const camel = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camel] = value;
      return result;
    }, {});
  }
  return obj;
}

// Helper to identify missing table/schema cache errors in Supabase
function isMissingTableError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('schema cache') ||
    msg.includes('not find') ||
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    err.code === 'PGRST116' ||
    err.code === '42P01'
  );
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());

  // Health check endpoint for deployment monitoring
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || "development"
    });
  });

  // Helper to resolve Supabase credentials from environment
  const getSupabaseEnvConfig = () => {
    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const key = (process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY || '').trim();
    return {
      configured: !!(url && key),
      url: url || null,
      key: key || null
    };
  };

  // Supabase connection status check
  app.get("/api/supabase/status", (req, res) => {
    const cfg = getSupabaseEnvConfig();
    res.json({
      configured: cfg.configured,
      url: cfg.url
    });
  });

  // Supabase config for client-side client initialization
  app.get("/api/supabase/config", (req, res) => {
    const cfg = getSupabaseEnvConfig();
    res.json({
      configured: cfg.configured,
      supabaseUrl: cfg.url,
      supabaseKey: cfg.key
    });
  });

  // Supabase two-way sync
  app.post("/api/supabase/sync", async (req, res) => {
    const cfg = getSupabaseEnvConfig();
    const url = cfg.url;
    const key = cfg.key;

    if (!url || !key) {
      return res.status(400).json({ error: "Supabase credentials are not configured in environment variables." });
    }

    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;

        // Proactive sleep if token iat is in the future relative to our server clock (clock skew mitigation)
        if (token && attempts === 0) {
          const parts = token.split('.');
          if (parts.length === 3) {
            try {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
              if (payload && typeof payload.iat === 'number') {
                const nowSecs = Math.floor(Date.now() / 1000);
                const skewSecs = payload.iat - nowSecs;
                if (skewSecs > 0) {
                  console.warn(`[Proactive Clock Skew Mitigation] JWT iat is ${skewSecs}s in the future. Sleeping for ${skewSecs + 1}s...`);
                  await new Promise(resolve => setTimeout(resolve, (skewSecs + 1) * 1000));
                }
              }
            } catch (e) {
              console.error("Failed to parse JWT payload for clock skew check:", e);
            }
          }
        }

        const supabase = createClient(url, key, {
          global: {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          }
        });

        const {
          userId,
          activeBusinessId,
          fetchOnly = false,
          businesses = [],
          staff = [],
          clients = [],
          packages = [],
          bookings = [],
          payments = [],
          services = []
        } = req.body;

        if (!userId) {
          return res.status(400).json({ error: "Authentication is required. User ID must be provided to synchronize." });
        }

        // Compute a secure, mapped fallback business ID
        let rawFallbackId = activeBusinessId || (businesses[0]?.id) || 'biz-1';
        const fallbackBizId = rawFallbackId === 'biz-1' ? `biz-1-${userId}` : rawFallbackId;

        if (!fetchOnly) {
          // 1. Upsert Businesses
          if (businesses.length > 0) {
            const dbBusinesses = toSnakeCase(businesses).map((b: any) => {
              const mappedId = b.id === 'biz-1' ? `biz-1-${userId}` : b.id;
              return { 
                ...b, 
                id: mappedId, 
                user_id: userId,
                created_at: b.created_at || new Date().toISOString()
              };
            });
            let { error: bizErr } = await supabase.from('businesses').upsert(dbBusinesses);
            if (bizErr && (
              bizErr.message?.includes('businesses_type_check') || 
              bizErr.message?.includes('check constraint') || 
              bizErr.code === '23514'
            )) {
              console.warn('Businesses upsert hit legacy type constraint. Retrying with safe fallback type for Supabase row...');
              const safeDbBusinesses = dbBusinesses.map((b: any) => {
                const allowed = ['salon', 'spa', 'clinic', 'gym'];
                const lowerType = (b.type || '').toLowerCase();
                const safeType = allowed.includes(lowerType) ? lowerType : 'salon';
                return { ...b, type: safeType };
              });
              const { error: retryErr } = await supabase.from('businesses').upsert(safeDbBusinesses);
              if (retryErr) {
                throw new Error(`Businesses upsert error: ${retryErr.message}`);
              }
            } else if (bizErr) {
              throw new Error(`Businesses upsert error: ${bizErr.message}`);
            }
          }

          // 2. Upsert Staff
          if (staff.length > 0) {
            const dbStaff = toSnakeCase(staff).map((s: any) => {
              const rawBizId = s.business_id || fallbackBizId;
              const mappedBizId = (rawBizId === 'biz-1' || !rawBizId) ? `biz-1-${userId}` : rawBizId;
              return { 
                ...s, 
                business_id: mappedBizId, 
                user_id: userId,
                created_at: s.created_at || new Date().toISOString()
              };
            });
            const { error: staffErr } = await supabase.from('staff').upsert(dbStaff);
            if (staffErr) throw new Error(`Staff upsert error: ${staffErr.message}`);
          }

          // 3. Upsert Clients
          if (clients.length > 0) {
            const dbClients = toSnakeCase(clients).map((c: any) => {
              const rawBizId = c.business_id || fallbackBizId;
              const mappedBizId = (rawBizId === 'biz-1' || !rawBizId) ? `biz-1-${userId}` : rawBizId;
              return { 
                ...c, 
                business_id: mappedBizId, 
                user_id: userId,
                created_at: c.created_at || new Date().toISOString()
              };
            });
            const { error: clientErr } = await supabase.from('clients').upsert(dbClients);
            if (clientErr) throw new Error(`Clients upsert error: ${clientErr.message}`);
          }

          // 4. Upsert Packages
          if (packages.length > 0) {
            const dbPackages = toSnakeCase(packages).map((p: any) => {
              const rawBizId = p.business_id || fallbackBizId;
              const mappedBizId = (rawBizId === 'biz-1' || !rawBizId) ? `biz-1-${userId}` : rawBizId;
              return { 
                ...p, 
                business_id: mappedBizId, 
                user_id: userId,
                created_at: p.created_at || new Date().toISOString()
              };
            });
            const { error: pkgErr } = await supabase.from('packages').upsert(dbPackages);
            if (pkgErr) throw new Error(`Packages upsert error: ${pkgErr.message}`);
          }

          // 5. Upsert and Delete Bookings
          const dbBookings = toSnakeCase(bookings).map((b: any) => {
            const rawBizId = b.business_id || fallbackBizId;
            const mappedBizId = (rawBizId === 'biz-1' || !rawBizId) ? `biz-1-${userId}` : rawBizId;
            return { 
              ...b, 
              business_id: mappedBizId, 
              user_id: userId,
              created_at: b.created_at || new Date().toISOString()
            };
          });

          const bookingIds = dbBookings.map((b: any) => b.id);
          if (bookingIds.length > 0) {
            const { error: delErr } = await supabase
              .from('bookings')
              .delete()
              .eq('user_id', userId)
              .eq('business_id', fallbackBizId)
              .not('id', 'in', `(${bookingIds.join(',')})`);
            if (delErr) throw new Error(`Bookings delete obsolete error: ${delErr.message}`);
          } else {
            const { error: delErr } = await supabase
              .from('bookings')
              .delete()
              .eq('user_id', userId)
              .eq('business_id', fallbackBizId);
            if (delErr) throw new Error(`Bookings delete all error: ${delErr.message}`);
          }

          if (dbBookings.length > 0) {
            const { error: bookingErr } = await supabase.from('bookings').upsert(dbBookings);
            if (bookingErr) throw new Error(`Bookings upsert error: ${bookingErr.message}`);
          }

          // 6. Upsert and Delete Payments
          const dbPayments = toSnakeCase(payments).map((p: any) => {
            const rawBizId = p.business_id || fallbackBizId;
            const mappedBizId = (rawBizId === 'biz-1' || !rawBizId) ? `biz-1-${userId}` : rawBizId;
            return { 
              ...p, 
              business_id: mappedBizId, 
              user_id: userId,
              created_at: p.created_at || new Date().toISOString()
            };
          });

          const paymentIds = dbPayments.map((p: any) => p.id);
          if (paymentIds.length > 0) {
            const { error: delErr } = await supabase
              .from('payments')
              .delete()
              .eq('user_id', userId)
              .eq('business_id', fallbackBizId)
              .not('id', 'in', `(${paymentIds.join(',')})`);
            if (delErr) throw new Error(`Payments delete obsolete error: ${delErr.message}`);
          } else {
            const { error: delErr } = await supabase
              .from('payments')
              .delete()
              .eq('user_id', userId)
              .eq('business_id', fallbackBizId);
            if (delErr) throw new Error(`Payments delete all error: ${delErr.message}`);
          }

          if (dbPayments.length > 0) {
            const { error: paymentErr } = await supabase.from('payments').upsert(dbPayments);
            if (paymentErr) throw new Error(`Payments upsert error: ${paymentErr.message}`);
          }

          // 7. Upsert and Delete Services
          try {
            const dbServices = toSnakeCase(services).map((s: any) => {
              const rawBizId = s.business_id || fallbackBizId;
              const mappedBizId = (rawBizId === 'biz-1' || !rawBizId) ? `biz-1-${userId}` : rawBizId;
              return {
                ...s,
                business_id: mappedBizId,
                user_id: userId,
                created_at: s.created_at || new Date().toISOString()
              };
            });

            const { error: serviceDelErr } = await supabase
              .from('services')
              .delete()
              .eq('user_id', userId)
              .eq('business_id', fallbackBizId);
            if (serviceDelErr) {
              if (isMissingTableError(serviceDelErr)) {
                // Ignore missing table error
              } else {
                throw new Error(`Services clear for business error: ${serviceDelErr.message}`);
              }
            } else if (dbServices.length > 0) {
              const { error: serviceErr } = await supabase.from('services').upsert(dbServices);
              if (serviceErr) {
                if (isMissingTableError(serviceErr)) {
                  // Ignore missing table error
                } else {
                  throw new Error(`Services upsert error: ${serviceErr.message}`);
                }
              }
            }
          } catch (servicesErr: any) {
            if (isMissingTableError(servicesErr)) {
              console.warn("Skipping services sync (table might not exist in Supabase yet):", servicesErr.message);
            } else {
              throw servicesErr; // Rethrow real database errors!
            }
          }
        }

        // Now fetch latest updated state from database scoped entirely to the current user
        const [
          { data: resBizs, error: f1 },
          { data: resStaff, error: f2 },
          { data: resClients, error: f3 },
          { data: resPkgs, error: f4 },
          { data: resBookings, error: f5 },
          { data: resPayments, error: f6 },
          { data: resServices, error: f7 }
        ] = await Promise.all([
          supabase.from('businesses').select('*').eq('user_id', userId),
          supabase.from('staff').select('*').eq('user_id', userId),
          supabase.from('clients').select('*').eq('user_id', userId),
          supabase.from('packages').select('*').eq('user_id', userId),
          supabase.from('bookings').select('*').eq('user_id', userId),
          supabase.from('payments').select('*').eq('user_id', userId),
          supabase.from('services').select('*').eq('user_id', userId)
        ]);

        const isServicesMissing = isMissingTableError(f7);
        const activeF7 = isServicesMissing ? null : f7;

        if (f1 || f2 || f3 || f4 || f5 || f6 || activeF7) {
          const errs = [f1, f2, f3, f4, f5, f6, activeF7].filter(Boolean).map(e => e?.message).join(', ');
          throw new Error(`Failed to retrieve updated database state: ${errs}`);
        }

        res.json({
          success: true,
          servicesTableMissing: isServicesMissing,
          data: {
            businesses: toCamelCase(resBizs || []),
            staff: toCamelCase(resStaff || []),
            clients: toCamelCase(resClients || []),
            packages: toCamelCase(resPkgs || []),
            bookings: toCamelCase(resBookings || []),
            payments: toCamelCase(resPayments || []),
            services: isServicesMissing ? [] : toCamelCase(resServices || [])
          }
        });
        return; // Successfully completed, return from request

      } catch (error: any) {
        attempts++;
        const errMsg = error.message || '';
        if (errMsg.includes('JWT issued at future') && attempts < maxAttempts) {
          console.warn(`[Reactive Clock Skew Mitigation] JWT issued at future detected. Retrying sync attempt ${attempts}/${maxAttempts} in 1200ms...`);
          await new Promise(resolve => setTimeout(resolve, 1200));
        } else {
          console.error("Supabase Sync Error:", error);
          return res.status(500).json({
            error: error.message || "Unknown database synchronization error.",
            hint: "Please ensure that you have run the schema in your Supabase SQL Editor and that RLS policies are configured correctly."
          });
        }
      }
    }
  });

  // API route for Chatbot
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const systemInstruction = `You are the Booking & Payment Manager AI Assistant.
Your goal is to guide users on how to use this app and assist them if they are confused about any feature.
This application is a lightweight booking, client, and payment management web app for salons, spas, clinics, and gyms.

Key features of this app:
1. Staff-Based Calendar (CalendarView.tsx):
   - Displays appointments, manages schedules (8:00 AM to 9:00 PM).
   - Detects booking conflicts for staff slots.
   - Allows changing statuses (pending, completed, cancelled, no-show).
   - Printable Thermal Receipt Preview (with beautiful ticket-like design and barcode!) for completed bookings.
   - "Share via WhatsApp" button on the receipt preview that deep-links to WhatsApp with a pre-formatted receipt message!
2. Client Profiles / Directory (ClientProfiles.tsx):
   - View list of clients, search by name/phone.
   - Sort client directory dynamically by: Recent Booking, Most Visits, Highest Spender, or Name (A-Z).
   - Shows detailed metrics for each client (Total Visits, Total Paid, Unpaid Dues, active/expired packages/memberships).
   - Form to add new clients.
3. Prepaid Packages Tracker (PackagesTracker.tsx):
   - Sell packages/memberships (e.g. 5x Haircut Package, Premium Gym Membership).
   - Track usage/visits remaining on packages.
   - Apply package credits to settle booking payments (prepaid packages apply ₹0.00 charge on receipt and mark as prepaid!).
4. Payments Ledger (PaymentsLedger.tsx):
   - Lists transactions (Paid, Unpaid, Refunded).
   - Settle unpaid bookings directly from here.
   - Sells packages and records the payment.
5. Settings Config (SettingsConfig.tsx):
   - Edit Business Name, Type, Owner Name, Contact Phone.
   - Customize Staff list (add, edit, toggle availability) and Services menu (add, edit, adjust price and duration).

Instructions for your responses:
- Answer the user clearly, politely, and concisely.
- Keep formatting neat and easy to read (use markdown bullet points, bold text).
- Suggest actionable steps on how they can navigate or use the app's features (e.g. "Go to the 'Settings' tab to add a custom service or staff member").
- Avoid deep technical jargon, focus purely on assisting the business owner or staff.`;

      // Convert frontend history to GenAI contents structure
      const formattedContents = [
        ...(history || []).map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text || msg.content || '' }]
        })),
        {
          role: 'user',
          parts: [{ text: message }]
        }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    console.log('Real-time WS client connected to Glance Server');

    ws.on('message', (message) => {
      try {
        const payloadStr = message.toString();
        const payload = JSON.parse(payloadStr);
        // Broadcast to all other open clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
          }
        });
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      console.log('Real-time WS client disconnected');
    });
  });

  // AI Daily Money Earning Quote endpoint
  app.get("/api/ai/quote", async (req, res) => {
    const fallbackQuotes = [
      { quote: "Small daily revenues compounded over time build lasting wealth and business independence.", author: "Daily Wealth AI" },
      { quote: "Focus on delivering value today, and today's revenue will naturally follow.", author: "Business Mindset AI" },
      { quote: "Every satisfied customer today is a seed for recurring income tomorrow.", author: "Growth Engine AI" },
      { quote: "Financial freedom isn't built overnight—it is earned one client, one booking, and one day at a time.", author: "Financial Vision AI" },
      { quote: "Consistency in service creates consistency in daily revenue.", author: "Hustle Intelligence AI" },
      { quote: "Track your numbers daily, serve with excellence, and watch your business earnings scale.", author: "Entrepreneur AI" }
    ];

    if (!process.env.GEMINI_API_KEY) {
      const randomFallback = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
      return res.json({ success: true, ...randomFallback, generatedBy: "Curated AI Collection" });
    }

    try {
      const sector = req.query.sector ? String(req.query.sector) : "business & services";
      const prompt = `Generate a single short, highly inspiring and actionable 1-sentence motivational quote specifically about earning money daily, growing revenue, and building wealth in ${sector}. Return JSON only with format: {"quote": "...", "author": "..."}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || '';
      const parsed = JSON.parse(text);
      if (parsed.quote) {
        return res.json({ success: true, quote: parsed.quote, author: parsed.author || "Gemini Wealth AI", generatedBy: "Gemini AI" });
      }
      throw new Error("Invalid output structure");
    } catch (err) {
      console.warn("Gemini quote generation fallback triggered:", err);
      const randomFallback = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
      return res.json({ success: true, ...randomFallback, generatedBy: "Curated AI Collection" });
    }
  });

  // Fallback 404 for unhandled API routes so Vite doesn't serve index.html for missing /api endpoints
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.originalUrl} not found.` });
  });

  // Global error handler for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) {
      console.error("API Route Error:", err);
      return res.status(err.status || 500).json({ error: err.message || "An internal server error occurred." });
    }
    next(err);
  });

  // Vite middleware for development or serving built static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Error starting server:", err);
});
