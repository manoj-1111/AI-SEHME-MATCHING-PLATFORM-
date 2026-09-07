import { db } from "@/db";
import { schemes, users, profiles } from "@/db/schema";
import { SCHEMES } from "@/data/schemes";
import { sql } from "drizzle-orm";

let seeded = false;

const DEMO_USERS = [
  {
    name: "Priya Murugan",
    email: "priya@demo.udyamsetu.in",
    role: "entrepreneur",
    profile: {
      fullName: "Priya Murugan", age: 28, gender: "Female", state: "Tamil Nadu",
      district: "Madurai", area: "Rural", category: "SC", disability: false, minority: false,
      annualIncome: 250000, existingLoans: false, employmentStatus: "Self-employed",
      education: "Higher Secondary (12th)", businessName: "Priya Foods", sector: "Food Processing",
      businessType: "Proprietorship", stage: "Startup", turnover: 0, employees: 3,
      businessLocation: "Madurai, Tamil Nadu", fundingRequired: 500000,
      supportTypes: ["Loan", "Subsidy", "Training"],
    },
  },
  {
    name: "Ravi Kumar",
    email: "ravi@demo.udyamsetu.in",
    role: "entrepreneur",
    profile: {
      fullName: "Ravi Kumar", age: 35, gender: "Male", state: "Karnataka",
      district: "Mysuru", area: "Rural", category: "ST", disability: false, minority: false,
      annualIncome: 180000, existingLoans: false, employmentStatus: "Farmer",
      education: "Secondary (10th)", businessName: "Green Harvest", sector: "Agriculture",
      businessType: "Proprietorship", stage: "Existing", turnover: 400000, employees: 2,
      businessLocation: "Mysuru, Karnataka", fundingRequired: 1500000,
      supportTypes: ["Loan", "Infrastructure"],
    },
  },
  {
    name: "Fatima Begum",
    email: "fatima@demo.udyamsetu.in",
    role: "entrepreneur",
    profile: {
      fullName: "Fatima Begum", age: 32, gender: "Female", state: "Uttar Pradesh",
      district: "Lucknow", area: "Urban", category: "General", disability: false, minority: true,
      annualIncome: 350000, existingLoans: true, employmentStatus: "Self-employed",
      education: "Graduate", businessName: "Noor Textiles", sector: "Textiles",
      businessType: "Proprietorship", stage: "Expansion", turnover: 900000, employees: 6,
      businessLocation: "Lucknow, Uttar Pradesh", fundingRequired: 1200000,
      supportTypes: ["Loan", "Marketing"],
    },
  },
  {
    name: "Arjun Deshmukh",
    email: "arjun@demo.udyamsetu.in",
    role: "entrepreneur",
    profile: {
      fullName: "Arjun Deshmukh", age: 26, gender: "Male", state: "Maharashtra",
      district: "Pune", area: "Urban", category: "OBC", disability: true, minority: false,
      annualIncome: 420000, existingLoans: false, employmentStatus: "Employed",
      education: "Postgraduate", businessName: "AccessTech Solutions", sector: "IT / Technology",
      businessType: "Private Limited", stage: "Idea", turnover: 0, employees: 0,
      businessLocation: "Pune, Maharashtra", fundingRequired: 2500000,
      supportTypes: ["Grant", "Loan"],
    },
  },
  {
    name: "Lakshmi Nair",
    email: "lakshmi@demo.udyamsetu.in",
    role: "entrepreneur",
    profile: {
      fullName: "Lakshmi Nair", age: 41, gender: "Female", state: "Kerala",
      district: "Thrissur", area: "Rural", category: "General", disability: false, minority: false,
      annualIncome: 300000, existingLoans: true, employmentStatus: "Self-employed",
      education: "Graduate", businessName: "Nair Handlooms", sector: "Handicrafts",
      businessType: "Proprietorship", stage: "Existing", turnover: 600000, employees: 4,
      businessLocation: "Thrissur, Kerala", fundingRequired: 300000,
      supportTypes: ["Loan", "Training", "Marketing"],
    },
  },
];

export async function ensureSeeded() {
  if (!process.env.DATABASE_URL || seeded) return;
  try {
    const schemeCount = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(schemes);
    if ((schemeCount[0]?.c ?? 0) === 0) {
      for (const s of SCHEMES) {
        await db
          .insert(schemes)
          .values({
            id: s.id,
            name: s.name,
            ministry: s.ministry,
            description: s.description,
            verificationStatus: s.verificationStatus,
            lastVerified: s.lastVerified,
            isActive: true,
            data: s,
          })
          .onConflictDoNothing();
      }
    }

    const userCount = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(users);
    if ((userCount[0]?.c ?? 0) === 0) {
      // admin user
      await db
        .insert(users)
        .values({ name: "SIH Admin", email: "admin@udyamsetu.in", role: "admin" })
        .onConflictDoNothing();
      for (const u of DEMO_USERS) {
        const inserted = await db
          .insert(users)
          .values({ name: u.name, email: u.email, role: u.role })
          .onConflictDoNothing()
          .returning({ id: users.id });
        const uid = inserted[0]?.id;
        if (uid) {
          await db.insert(profiles).values({
            userId: uid,
            state: u.profile.state,
            category: u.profile.category,
            gender: u.profile.gender,
            sector: u.profile.sector,
            area: u.profile.area,
            data: u.profile,
          });
        }
      }
    }
    seeded = true;
  } catch (e) {
    console.error("Seeding failed", e);
  }
}
