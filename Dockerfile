FROM node:20-slim AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install all dependencies
RUN npm ci --prefer-offline || npm install

# Copy application source
COPY . .

# Build arguments for Vite client bundle
ARG VITE_BACKEND_URL=https://lawyer-backend-production-19db.up.railway.app
ARG VITE_API_BASE_URL=https://lawyer-backend-production-19db.up.railway.app
ARG VITE_API_KEY=amicus-dev-2024
ARG VITE_CLERK_PUBLISHABLE_KEY=pk_test_bGFyZ2Utcm9kZW50LTM4LmNsZXJrLmFjY291bnRzLmRldiQ
ARG VITE_CLERK_SIGN_UP_URL=/accept-invitation
ARG VITE_SUPABASE_URL=https://ogbuynedouxbvdhrheyq.supabase.co
ARG VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Fx60n2qkyChTyePGCSAxKg_52oa7e0h
ARG VITE_SUPABASE_PROJECT_ID=ogbuynedouxbvdhrheyq
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_bGFyZ2Utcm9kZW50LTM4LmNsZXJrLmFjY291bnRzLmRldiQ
ARG VITE_CLERK_PUBLISHABLE_KEY_LIVE=pk_live_Y2xlcmsuc2VjdGlvbi1haS5sb3ZhYmxlLmFwcCQ

ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_KEY=${VITE_API_KEY}
ENV VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}
ENV VITE_CLERK_SIGN_UP_URL=${VITE_CLERK_SIGN_UP_URL}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
ENV VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID}
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV VITE_CLERK_PUBLISHABLE_KEY_LIVE=${VITE_CLERK_PUBLISHABLE_KEY_LIVE}

ENV NITRO_PRESET=node-server
ENV NODE_ENV=production

# Compile production bundle
RUN npm run build

# Runner stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy output from builder
COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
