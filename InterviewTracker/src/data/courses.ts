// Seed catalog of courses sourced from the user's personal tracking sheet.
// Insertion is idempotent (INSERT OR IGNORE on the title unique index in db.ts),
// so editing % values here won't overwrite values the user has updated in app.
export interface SeedCourse {
  title: string;
  stream: string;
  progressPct: number;       // 0..100
  platform?: string;
  accountEmail?: string;
}

export const SEED_COURSES: SeedCourse[] = [
  { title: "Complete Data Science,Machine Learning,DL,NLP Bootcamp", stream: "Machine Learning", progressPct: 0 },
  { title: "Data Structures and Algorithms: In Depth DSA using C#", stream: "C#", progressPct: 0 },
  { title: "Clean Architecture in .NET Core MVC[.NET 8] - Complete Guide", stream: "Dotnet", progressPct: 0 },
  { title: "C# 12 - Ultimate Guide - Beginner to Advanced | Master class", stream: "C#", progressPct: 27 },
  { title: "The Complete Python Developer", stream: "Python", progressPct: 7 },
  { title: "Getting started with Clean Architecture using .Net Core", stream: "Dotnet", progressPct: 8 },
  { title: "Complete Math, Statistics & Probability for Machine Learning", stream: "Machine Learning", progressPct: 6 },
  { title: "Mathematical Foundations of Machine Learning", stream: "Machine Learning", progressPct: 1 },
  { title: "Master statistics & machine learning: intuition, math, code", stream: "Machine Learning", progressPct: 1 },
  { title: "Machine Learning Essentials - Master core ML concepts", stream: "Machine Learning", progressPct: 0 },
  { title: "[NEW] AI Mastery Bootcamp: Complete Guide with 1000 Projects", stream: "Machine Learning", progressPct: 0 },
  { title: "Machine Learning A-Z: AI, Python & R + ChatGPT Prize [2025]", stream: "Machine Learning", progressPct: 2 },
  { title: "Swift 5 Programming Bootcamp For Beginners", stream: "IOS", progressPct: 0 },
  { title: "iOS Development Crash Course - Learn How to Create iOS Apps", stream: "IOS", progressPct: 0 },
  { title: "Introduction to R Programming", stream: "R", progressPct: 0 },
  { title: "Ethical Hacking and Penetration Testing with Kali Linux", stream: "Pentest", progressPct: 1 },
  { title: "Azure DevOps for .NET Developer (CI/CD, Boards, Repo & Wiki)", stream: "Devops", progressPct: 83 },
  { title: ".NET Core Microservices - The Complete Guide (.NET 8 MVC)", stream: "Dotnet", progressPct: 60 },
  { title: "Asp.Net Core 9 (.NET 9) | True Ultimate Guide", stream: "Dotnet", progressPct: 19 },
  { title: "ASP.NET Core Identity - Authentication & Authorization [MVC]", stream: "Dotnet", progressPct: 13 },
  { title: ".NET Microservices with Azure DevOps & AKS | Basic to Master", stream: "Dotnet", progressPct: 0 },
  { title: ".NET 8 Backend Bootcamp: Modulith, VSA, DDD, CQRS and Outbox", stream: "Dotnet", progressPct: 15 },
  { title: "DevOps Beginners to Advanced with Projects", stream: "Devops", progressPct: 3 },
  { title: "The Windows Presentation Foundation WPF Guide for beginners", stream: "WPF", progressPct: 10 },
  { title: "Full Stack React Bootcamp with .NET API [10 Projects]", stream: "Dotnet", progressPct: 7 },
  { title: "Getting Started .NET Core Microservices RabbitMQ", stream: "Dotnet", progressPct: 90 },
  { title: "AWS for DotNet (.Net) Core Developers", stream: "Dotnet", progressPct: 3 },
  { title: "SignalR - The Complete Guide (with real world examples)", stream: "Dotnet", progressPct: 23 },
  { title: "Xamarin Android: Learn to Build Native Android Apps With C#", stream: "Dotnet", progressPct: 15 },
  { title: "Creating .Net Core Microservices using Clean Architecture", stream: "Dotnet", progressPct: 4 },
  { title: ".NET 8 Microservices: DDD, CQRS, Vertical/Clean Architecture", stream: "Dotnet", progressPct: 94 },
  { title: "NumPy, Pandas and Matplotlib A-Z™ for Machine Learning", stream: "Machine Learning", progressPct: 0 },
  { title: ".NET/C# Interview Masterclass- Top 500 Questions (PDF)(2025) | Udemy", stream: "C#", progressPct: 0 },
  { title: "Azure Data Engineering End-to-end Course (English)", stream: "Data Engineering", progressPct: 0 },
  { title: "Data Engineering for Beginners: Learn SQL, Python & Spark", stream: "Data Engineering", progressPct: 0 },
  { title: "React - The Complete Guide 2025 (incl. Next.js, Redux)", stream: "React", progressPct: 0 },
  { title: "The Ultimate React Course 2025: React, Next.js, Redux & More", stream: "React", progressPct: 0 },
  { title: "Complete guide to building an app with .Net Core and React", stream: "Dotnet", progressPct: 0 },
  { title: "Playwright Python and Pytest for Web Automation Testing", stream: "Automation Testing", progressPct: 0 },
  { title: "Playwright PYTHON Automation Testing - From Zero to Expert", stream: "Automation Testing", progressPct: 0 },
];

export const STREAM_COLORS: Record<string, string> = {
  "Dotnet": "#8b5cf6",
  "C#": "#a855f7",
  "Machine Learning": "#06b6d4",
  "Python": "#3b82f6",
  "IOS": "#f43f5e",
  "R": "#22c55e",
  "Pentest": "#ef4444",
  "Devops": "#f97316",
  "WPF": "#0ea5e9",
  "Data Engineering": "#eab308",
  "React": "#14b8a6",
  "Automation Testing": "#ec4899",
};

export function streamColor(stream: string): string {
  return STREAM_COLORS[stream] ?? "#64748b";
}
