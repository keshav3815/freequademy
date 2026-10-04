// Load test for the student dashboard read model (Architecture V1 Phase 6).
// Open source (k6, run via Docker); never point it at production without an
// announced window — use staging.
//
//   docker run --rm -i --network host grafana/k6 run \
//     -e SUPABASE_URL=https://api-staging.freequademy.com -e ANON_KEY=... \
//     -e EMAIL=loadtest@example.com -e PASSWORD=... - < load/k6-dashboard.js
//
// Thresholds encode the Phase 2 targets; a breach fails the run.
import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    students: { executor: "ramping-vus", startVUs: 1, stages: [
      { duration: "20s", target: 20 },
      { duration: "40s", target: 50 },
      { duration: "20s", target: 0 },
    ] },
  },
  thresholds: {
    "http_req_failed": ["rate<0.01"],
    "http_req_duration{name:dashboard}": ["p(95)<500"],
  },
};

const BASE = __ENV.SUPABASE_URL;
const ANON = __ENV.ANON_KEY;

export function setup() {
  const res = http.post(`${BASE}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: __ENV.EMAIL, password: __ENV.PASSWORD }),
    { headers: { apikey: ANON, "Content-Type": "application/json" } });
  check(res, { "signed in": (r) => r.status === 200 });
  return { token: res.json("access_token") };
}

export default function (data) {
  const today = new Date();
  const from = new Date(today.getTime() - 83 * 86400000);
  const res = http.post(`${BASE}/rest/v1/rpc/get_student_dashboard`,
    JSON.stringify({ _class_level: 10, _from: from.toISOString().slice(0, 10), _to: today.toISOString().slice(0, 10) }),
    { headers: { apikey: ANON, Authorization: `Bearer ${data.token}`, "Content-Type": "application/json" }, tags: { name: "dashboard" } });
  check(res, {
    "200": (r) => r.status === 200,
    "all 11 sections": (r) => Object.keys(r.json() || {}).length === 11,
  });
}
