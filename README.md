<div align="center">
  <h1>sync-space</h1>
  <p>An infinite, real-time collaborative whiteboard built for seamless visual communication.</p>
</div>

## 🎨 Overview

**sync-space** is a modern, high-performance web application that allows multiple users to join a shared room and draw, brainstorm, and ideate in real-time. It features an infinite canvas, a variety of shapes (pencils, rectangles, circles, rhombi, lines, arrows, text), element locking to prevent race conditions, and an ambient dark-themed aesthetic.

## 🚀 Features

- **Infinite Canvas:** Pan and zoom freely across the board.
- **Real-Time Collaboration:** See cursors, live pencil strokes, and shape previews instantly using WebSockets.
- **Rich Toolkit:** Freehand drawing, varied shapes, text insertion, and a smart select tool with robust resizing logic.
- **Concurrency Control:** Automatic element locking when someone else is modifying an object.
- **Secure Authentication:** OAuth integration with Google and GitHub.

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, TypeScript
- **Backend:** Node.js, Express, Socket.io
- **Database:** PostgreSQL (Neon Serverless), Prisma ORM
- **Monorepo Management:** Turborepo

## 📂 File Structure

The project is structured as a Turborepo monorepo, keeping boundaries clear and code reusable:

```text
sync-space/
├── apps/
│   ├── server/             # Express.js & Socket.io server
│   │   ├── src/index.ts    # Main WebSocket and HTTP server entry
│   │   └── package.json    # Server dependencies
│   └── web/                # Next.js 14 frontend application
│       ├── app/            # App router pages (dashboard, canvas, auth)
│       │   └── canvas/     # The core collaborative whiteboard component
│       ├── components/     # Reusable UI components
│       ├── hooks/          # Custom React hooks (e.g., useSocket)
│       └── package.json    # Web dependencies
├── packages/
│   ├── database/           # Prisma schema, migrations, and seed logic
│   ├── types/              # Shared Typescript interfaces (DrawData, Elements)
│   ├── config-eslint/      # Universal ESLint configurations
│   └── config-typescript/  # Universal TSConfig setups
├── README.md               # Project documentation
├── turbo.json              # Turborepo pipeline configuration
└── package.json            # Root configuration
```

## 💻 Local Setup & Contribution Guide

If you'd like to contribute or run the project locally, follow these steps:

### 1. Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (v10.x +)
- A **PostgreSQL** database (Local or cloud, e.g., Neon)

### 2. Installation

Clone the repository and install the dependencies for all packages:
```bash
git clone https://github.com/your-username/sync-space.git
cd sync-space
npm install
```

### 3. Environment Variables

Create and configure your `.env` file at the root of the project using the provided example file:
```bash
cp .env.example .env
```
Inside `.env`, populate the variables:
- `DATABASE_URL`: Connection string to your PostgreSQL instance.
- `NEXTAUTH_SECRET`: A secure key used to encrypt sessions.
- `GITHUB_ID` & `GITHUB_SECRET`: For GitHub OAuth.
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: For Google OAuth.

### 4. Database Setup

Using Prisma, push the schema to your database and generate the client. Run the following command from the root directory:
```bash
npm run db:push
npm run generate
```

### 5. Running the Application

Because this is a Turborepo, you can easily spring up both the frontend and the WebSocket server simultaneously:
```bash
npm run dev
```
- The **Next.js web app** will run on `http://localhost:3000`
- The **Socket.io server** will run on `http://localhost:3001`

### 6. Contributing

1. **Fork the repository.**
2. **Create a new branch** (`git checkout -b feature/your-feature-name`).
3. **Commit your changes** (`git commit -m 'Add some feature'`).
4. **Push to the branch** (`git push origin feature/your-feature-name`).
5. **Open a Pull Request.**

Ensure all code follows the established ESLint and Prettier formatting standard.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
