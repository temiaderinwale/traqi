/** @type {import("next").NextConfig} */
const nextConfig = {
  /* Dev only: `next dev` compiles routes on demand, then disposes them
     (defaults: 60s idle, 5 routes buffered). With 23 routes that means
     constant recompiling. Keep every route in memory for the session instead. */
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 60,
    pagesBufferLength: 25
  }
};
export default nextConfig;
