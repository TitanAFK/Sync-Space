import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "./lib/auth";
import Link from "next/link";
import { ArrowRight, Box, Layers, Zap } from "lucide-react";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-hidden relative selection:bg-blue-500/30">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] -z-10 pointer-events-none"></div>

      <nav className="container mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Box className="w-5 h-5 text-white" />
          </div>
          Sync-Space
        </div>
        <Link
          href="/auth"
          className="text-sm font-medium text-neutral-300 hover:text-white transition-colors"
        >
          Sign In
        </Link>
      </nav>

      <main className="container mx-auto px-6 pt-32 pb-24 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-8 border border-blue-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Real-time collaboration reimagined
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            The boundless canvas for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">your best ideas.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-neutral-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Brainstorm, diagram, and collaborate in real-time. Sync-Space is where teams bring their imagination to life.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth"
              className="flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-semibold text-lg hover:bg-neutral-200 transition-all hover:scale-105 active:scale-95"
            >
              Get Started for Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/auth"
              className="flex items-center gap-2 px-8 py-4 bg-neutral-900 text-white rounded-full font-semibold text-lg border border-neutral-800 hover:bg-neutral-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Feature Grid Mockup */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Zap className="w-6 h-6 text-yellow-400" />,
              title: "Instant Sync",
              desc: "Changes appear instantly for everyone. No more refreshing or waiting."
            },
            {
              icon: <Layers className="w-6 h-6 text-blue-400" />,
              title: "Infinite Canvas",
              desc: "Never run out of space. Zoom in for details, zoom out for the big picture."
            },
            {
              icon: <Box className="w-6 h-6 text-purple-400" />,
              title: "Shape Library",
              desc: "A comprehensive set of shapes and arrows to build complex diagrams."
            }
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-neutral-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}