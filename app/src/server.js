const express = require("express");
const promClient = require("prom-client");

const app = express();
app.use(express.json());

// Create a registry for Prometheus metrics
const register = new promClient.Registry();

// Collect default Node.js metrics: memory, CPU, event loop, etc.
promClient.collectDefaultMetrics({ register });

// Count HTTP requests
const httpRequestsTotal = new promClient.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [register],
});

// Measure HTTP request duration
const httpRequestDuration = new promClient.Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.1, 0.3, 0.5, 1, 2, 5],
    registers: [register],
});

// Record requests, excluding the metrics endpoint itself
app.use((req, res, next) => {
    if (req.path === "/metrics") {
        return next();
    }

    const start = process.hrtime.bigint();

    res.on("finish", () => {
        const route = req.route?.path || req.path;

        const labels = {
            method: req.method,
            route,
            status_code: String(res.statusCode),
        };

        httpRequestsTotal.inc(labels);

        const duration =
            Number(process.hrtime.bigint() - start) / 1e9;

        httpRequestDuration.observe(labels, duration);
    });

    next();
});

// Payment service V2
app.get("/", (req, res) => {
    res.json({
        service: "payment-service",
        message: "Hello from Payment Service V2",
    });
});

// Health check
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "UP",
    });
});

// Prometheus metrics endpoint
app.get("/metrics", async (req, res) => {
    try {
        res.set("Content-Type", register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).end(error.message);
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
