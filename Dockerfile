# Stage 1: Dependencies
FROM node:24-alpine AS deps
WORKDIR /app
# Enable Corepack for Yarn Berry
RUN npm install -g corepack@latest
RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./

# Install dependencies (frozen lockfile)
RUN yarn install --immutable

# Stage 2: Builder
FROM node:24-alpine AS builder
WORKDIR /app
RUN npm install -g corepack@latest
RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN yarn build

# Stage 3: Runner
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g corepack@latest
RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Copy built assets
COPY --from=builder /app/dist ./dist
# Copy node_modules (including dev deps unfortunately, unless we clean or separate logic, but this is safe)
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/main"]

