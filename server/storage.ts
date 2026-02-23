import { type User, type InsertUser } from "@shared/schema";
import type {
  StormEvent,
  Adjuster,
  Claim,
  ClaimNote,
  ClaimActivity,
  ClaimsFilter,
  ClaimStatus,
  DashboardMetrics,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getStormEvents(): Promise<StormEvent[]>;
  getStormEvent(id: string): Promise<StormEvent | undefined>;
  getAdjusters(): Promise<Adjuster[]>;
  getAdjuster(id: string): Promise<Adjuster | undefined>;
  getClaims(filter?: ClaimsFilter): Promise<Claim[]>;
  getClaim(id: string): Promise<Claim | undefined>;
  getClaimByNumber(claimNumber: string): Promise<Claim | undefined>;
  updateClaimStatus(claimId: string, status: ClaimStatus, performedBy?: string, performedByRole?: string): Promise<Claim | undefined>;
  assignClaim(claimId: string, adjusterId: string, performedBy?: string): Promise<Claim | undefined>;
  bulkAssignClaims(claimIds: string[], adjusterId: string): Promise<Claim[]>;
  getClaimNotes(claimId: string): Promise<ClaimNote[]>;
  addClaimNote(note: Omit<ClaimNote, "id" | "timestamp">): Promise<ClaimNote>;
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getAdjusterWorkload(): Promise<Array<Adjuster & { assignedClaimsCount: number }>>;
  getClaimActivity(claimId: string): Promise<ClaimActivity[]>;
  addClaimActivity(activity: Omit<ClaimActivity, "id" | "timestamp">): Promise<ClaimActivity>;
  getAllActivity(): Promise<ClaimActivity[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private stormEvents: Map<string, StormEvent>;
  private adjusters: Map<string, Adjuster>;
  private claims: Map<string, Claim>;
  private claimNotes: Map<string, ClaimNote[]>;
  private claimActivity: Map<string, ClaimActivity[]>;

  constructor() {
    this.users = new Map();
    this.stormEvents = new Map();
    this.adjusters = new Map();
    this.claims = new Map();
    this.claimNotes = new Map();
    this.claimActivity = new Map();
    this.seedData();
  }

  private seedData() {
    const storms: StormEvent[] = [
      {
        id: "STORM-001",
        name: "Hurricane Milton",
        category: 4,
        status: "active",
        affectedRegions: ["Florida Gulf Coast", "Central Florida", "Tampa Bay"],
        startDate: "2026-02-01",
        totalClaims: 847,
        estimatedTotalLoss: 124000000,
      },
      {
        id: "STORM-002",
        name: "Hurricane Helena",
        category: 3,
        status: "past",
        affectedRegions: ["Georgia Coast", "South Carolina"],
        startDate: "2026-01-15",
        endDate: "2026-01-22",
        totalClaims: 523,
        estimatedTotalLoss: 67000000,
      },
      {
        id: "STORM-003",
        name: "Tropical Storm Beta",
        category: 1,
        status: "monitoring",
        affectedRegions: ["Louisiana", "Mississippi Coast"],
        startDate: "2026-02-10",
        totalClaims: 156,
        estimatedTotalLoss: 18000000,
      },
    ];
    for (const s of storms) this.stormEvents.set(s.id, s);

    const adjustersData: Adjuster[] = [
      {
        id: "ADJ-001",
        name: "Maria Santos",
        email: "maria.santos@claimsadj.com",
        phone: "(813) 555-0142",
        region: "Florida Gulf Coast",
        specialties: ["wind", "structural", "flood"],
        maxCaseload: 25,
        currentCaseload: 23,
        status: "busy",
        latitude: 27.9506,
        longitude: -82.4572,
      },
      {
        id: "ADJ-002",
        name: "James Crawford",
        email: "james.crawford@claimsadj.com",
        phone: "(407) 555-0198",
        region: "Central Florida",
        specialties: ["wind", "hail", "debris"],
        maxCaseload: 20,
        currentCaseload: 12,
        status: "available",
        latitude: 28.5383,
        longitude: -81.3792,
      },
      {
        id: "ADJ-003",
        name: "Patricia Nguyen",
        email: "patricia.nguyen@claimsadj.com",
        phone: "(912) 555-0234",
        region: "Georgia Coast",
        specialties: ["flood", "water_damage", "structural"],
        maxCaseload: 20,
        currentCaseload: 19,
        status: "busy",
        latitude: 32.0809,
        longitude: -81.0912,
      },
      {
        id: "ADJ-004",
        name: "Robert Chen",
        email: "robert.chen@claimsadj.com",
        phone: "(843) 555-0167",
        region: "South Carolina",
        specialties: ["wind", "hail", "fire"],
        maxCaseload: 25,
        currentCaseload: 8,
        status: "available",
        latitude: 32.7765,
        longitude: -79.9311,
      },
      {
        id: "ADJ-005",
        name: "Angela Washington",
        email: "angela.washington@claimsadj.com",
        phone: "(504) 555-0289",
        region: "Louisiana",
        specialties: ["flood", "water_damage", "wind"],
        maxCaseload: 20,
        currentCaseload: 6,
        status: "available",
        latitude: 29.9511,
        longitude: -90.0715,
      },
      {
        id: "ADJ-006",
        name: "David Kim",
        email: "david.kim@claimsadj.com",
        phone: "(813) 555-0311",
        region: "Tampa Bay",
        specialties: ["structural", "wind", "lightning"],
        maxCaseload: 25,
        currentCaseload: 24,
        status: "busy",
        latitude: 27.7676,
        longitude: -82.6403,
      },
      {
        id: "ADJ-007",
        name: "Sarah Mitchell",
        email: "sarah.mitchell@claimsadj.com",
        phone: "(228) 555-0145",
        region: "Mississippi Coast",
        specialties: ["flood", "wind", "debris"],
        maxCaseload: 20,
        currentCaseload: 4,
        status: "available",
        latitude: 30.3960,
        longitude: -89.0928,
      },
      {
        id: "ADJ-008",
        name: "Thomas Rivera",
        email: "thomas.rivera@claimsadj.com",
        phone: "(941) 555-0278",
        region: "Florida Gulf Coast",
        specialties: ["fire", "structural", "other"],
        maxCaseload: 20,
        currentCaseload: 0,
        status: "unavailable",
        latitude: 27.3364,
        longitude: -82.5307,
      },
    ];
    for (const a of adjustersData) this.adjusters.set(a.id, a);

    const firstNames = [
      "Michael", "Jennifer", "William", "Elizabeth", "Carlos", "Linda", "Richard", "Barbara",
      "Joseph", "Susan", "Thomas", "Margaret", "Christopher", "Dorothy", "Daniel", "Lisa",
      "Matthew", "Nancy", "Anthony", "Karen", "Mark", "Betty", "Steven", "Helen",
      "Paul", "Sandra", "Andrew", "Donna", "Joshua", "Carol", "Kevin", "Ruth",
      "Brian", "Sharon", "Edward", "Michelle", "Ronald", "Laura", "Timothy", "Sarah",
      "Jason", "Kimberly", "Jeffrey", "Deborah", "Frank", "Jessica", "Scott", "Shirley",
    ];
    const lastNames = [
      "Johnson", "Williams", "Garcia", "Martinez", "Brown", "Davis", "Miller", "Wilson",
      "Anderson", "Taylor", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson",
      "Robinson", "Clark", "Lewis", "Lee", "Walker", "Hall", "Allen", "Young",
      "Hernandez", "King", "Wright", "Lopez", "Hill", "Scott", "Green", "Adams",
      "Baker", "Gonzalez", "Nelson", "Carter", "Mitchell", "Perez", "Roberts", "Turner",
      "Phillips", "Campbell", "Parker", "Evans", "Edwards", "Collins", "Stewart", "Morris",
    ];

    const flCities = [
      { city: "Tampa", zip: "33601" }, { city: "St. Petersburg", zip: "33701" },
      { city: "Clearwater", zip: "33755" }, { city: "Sarasota", zip: "34230" },
      { city: "Fort Myers", zip: "33901" }, { city: "Naples", zip: "34101" },
      { city: "Orlando", zip: "32801" }, { city: "Lakeland", zip: "33801" },
      { city: "Bradenton", zip: "34205" }, { city: "Port Charlotte", zip: "33948" },
    ];
    const gaCities = [
      { city: "Savannah", zip: "31401" }, { city: "Brunswick", zip: "31520" },
      { city: "St. Simons Island", zip: "31522" }, { city: "Tybee Island", zip: "31328" },
    ];
    const scCities = [
      { city: "Charleston", zip: "29401" }, { city: "Hilton Head", zip: "29926" },
      { city: "Beaufort", zip: "29902" }, { city: "Myrtle Beach", zip: "29577" },
    ];
    const laCities = [
      { city: "New Orleans", zip: "70112" }, { city: "Baton Rouge", zip: "70801" },
      { city: "Houma", zip: "70360" }, { city: "Lake Charles", zip: "70601" },
    ];

    const streets = [
      "Oak Lane", "Maple Drive", "Palm Avenue", "Bayshore Boulevard", "Gulf Drive",
      "Sunset Way", "Harbor View Road", "Coastal Highway", "Pine Street", "Magnolia Court",
      "Beach Road", "Coral Way", "Pelican Drive", "Cypress Lane", "Mangrove Circle",
    ];

    const damageTypes: Array<"wind" | "flood" | "hail" | "fire" | "lightning" | "debris" | "water_damage" | "structural" | "other"> = [
      "wind", "wind", "wind", "flood", "flood", "flood", "hail", "hail",
      "debris", "water_damage", "structural", "lightning", "fire", "other",
    ];

    const severities: Array<"catastrophic" | "major" | "moderate" | "minor"> = [
      "major", "major", "major", "moderate", "moderate", "moderate", "moderate",
      "catastrophic", "minor", "minor",
    ];

    const statuses: Array<ClaimStatus> = [
      "new", "new", "new", "new", "triaged", "triaged", "triaged",
      "assigned", "assigned", "inspected", "estimated", "approved", "settled", "closed",
    ];

    const descriptions = [
      "Roof damage from high winds, multiple shingles missing and water intrusion in attic",
      "Flooding in ground floor, 2 feet of standing water damaged flooring and walls",
      "Large tree fell on garage, structural collapse of roof section",
      "Hail damage to roof and exterior siding, multiple windows cracked",
      "Wind-driven rain caused significant water damage to interior walls and ceiling",
      "Fence destroyed and pool cage collapsed from wind gusts",
      "Storm surge flooding damaged foundation and ground floor contents",
      "Lightning strike caused electrical fire in attic, roof damaged",
      "Flying debris impacted front of home, broken windows and damaged siding",
      "Complete roof loss from Category 4 winds, home uninhabitable",
      "Flooding in basement and first floor, HVAC system destroyed",
      "Wind damage to commercial property roof, inventory water damage",
      "Carport and detached structure collapsed, vehicle damaged",
      "Water intrusion through damaged roof caused mold in multiple rooms",
      "Structural cracking in walls and foundation from storm force winds",
    ];

    const claimsData: Claim[] = [];
    let claimIndex = 1;

    const stormDistribution = [
      { stormId: "STORM-001", count: 25, state: "FL", cities: flCities },
      { stormId: "STORM-002", count: 15, stateOptions: [{ state: "GA", cities: gaCities }, { state: "SC", cities: scCities }] },
      { stormId: "STORM-003", count: 8, state: "LA", cities: laCities },
    ];

    for (const dist of stormDistribution) {
      for (let i = 0; i < dist.count; i++) {
        const idx = claimIndex;
        const claimNum = `CLM-2026-${String(idx).padStart(5, "0")}`;
        const fn = firstNames[idx % firstNames.length];
        const ln = lastNames[(idx * 7) % lastNames.length];
        const severity = severities[idx % severities.length];
        const status = statuses[idx % statuses.length];
        const damageType = damageTypes[idx % damageTypes.length];
        const description = descriptions[idx % descriptions.length];

        let state: string;
        let cityData: { city: string; zip: string };
        if ("stateOptions" in dist && dist.stateOptions) {
          const opt = dist.stateOptions[i % dist.stateOptions.length];
          state = opt.state;
          cityData = opt.cities[i % opt.cities.length];
        } else {
          state = dist.state!;
          cityData = dist.cities![i % dist.cities!.length];
        }

        const policyPrefix = state === "FL" ? "POL-FL" : state === "GA" ? "POL-GA" : state === "SC" ? "POL-SC" : "POL-LA";
        const policyNumber = `${policyPrefix}-${String(30000 + idx * 13).padStart(5, "0")}`;
        const streetNum = 100 + (idx * 37) % 9900;
        const street = streets[idx % streets.length];

        let estimatedLoss: number;
        switch (severity) {
          case "catastrophic": estimatedLoss = 200000 + Math.round((idx * 7919) % 300000); break;
          case "major": estimatedLoss = 50000 + Math.round((idx * 4523) % 150000); break;
          case "moderate": estimatedLoss = 10000 + Math.round((idx * 2731) % 40000); break;
          case "minor": estimatedLoss = 1000 + Math.round((idx * 1117) % 9000); break;
        }

        const dayOffset = (idx * 3) % 14;
        const filedDate = `2026-02-${String(1 + dayOffset).padStart(2, "0")}`;
        const today = new Date("2026-02-14");
        const filed = new Date(filedDate);
        const ageDays = Math.max(1, Math.floor((today.getTime() - filed.getTime()) / (1000 * 60 * 60 * 24)));

        const severityScore = severity === "catastrophic" ? 4 : severity === "major" ? 3 : severity === "moderate" ? 2 : 1;
        const ageScore = Math.min(5, Math.ceil(ageDays / 3));
        const priority = Math.min(10, severityScore + ageScore + (status === "new" ? 1 : 0));

        let assignedAdjusterId: string | undefined;
        let assignedAdjusterName: string | undefined;
        if (status === "assigned" || status === "inspected" || status === "estimated" || status === "approved" || status === "settled" || status === "closed") {
          const adjusterList = adjustersData.filter(a =>
            (dist.stormId === "STORM-001" && ["Florida Gulf Coast", "Central Florida", "Tampa Bay"].includes(a.region)) ||
            (dist.stormId === "STORM-002" && ["Georgia Coast", "South Carolina"].includes(a.region)) ||
            (dist.stormId === "STORM-003" && ["Louisiana", "Mississippi Coast"].includes(a.region))
          );
          if (adjusterList.length > 0) {
            const adj = adjusterList[i % adjusterList.length];
            assignedAdjusterId = adj.id;
            assignedAdjusterName = adj.name;
          }
        }

        const claim: Claim = {
          id: `claim-${String(idx).padStart(3, "0")}`,
          claimNumber: claimNum,
          policyNumber,
          policyholderName: `${fn} ${ln}`,
          policyholderPhone: `(${state === "FL" ? "813" : state === "GA" ? "912" : state === "SC" ? "843" : "504"}) 555-${String(1000 + idx).padStart(4, "0")}`,
          policyholderEmail: `${fn.toLowerCase()}.${ln.toLowerCase()}@email.com`,
          propertyAddress: `${streetNum} ${street}`,
          propertyCity: cityData.city,
          propertyState: state,
          propertyZip: cityData.zip,
          stormEventId: dist.stormId,
          damageType,
          severity,
          status,
          description,
          estimatedLoss,
          approvedAmount: status === "approved" || status === "settled" || status === "closed" ? Math.round(estimatedLoss * 0.85) : undefined,
          assignedAdjusterId,
          assignedAdjusterName,
          filedDate,
          lastUpdated: `2026-02-${String(Math.min(14, 1 + dayOffset + 2)).padStart(2, "0")}`,
          inspectionDate: status === "inspected" || status === "estimated" || status === "approved" || status === "settled" ? `2026-02-${String(Math.min(14, 1 + dayOffset + 3)).padStart(2, "0")}` : undefined,
          settlementDate: status === "settled" || status === "closed" ? `2026-02-${String(Math.min(14, 1 + dayOffset + 5)).padStart(2, "0")}` : undefined,
          photos: (idx * 3) % 12,
          priority,
          notes: undefined,
        };

        claimsData.push(claim);
        claimIndex++;
      }
    }

    for (const c of claimsData) {
      this.claims.set(c.id, c);
      this.claimNotes.set(c.id, []);
    }

    const sampleNotes: Array<{ claimIdx: number; author: string; role: string; content: string }> = [
      { claimIdx: 0, author: "Maria Santos", role: "Field Adjuster", content: "Initial assessment complete. Significant roof damage observed. Recommending full inspection." },
      { claimIdx: 0, author: "System", role: "Auto-Triage", content: "Claim auto-triaged as major severity based on reported damage and storm category." },
      { claimIdx: 2, author: "James Crawford", role: "Field Adjuster", content: "On-site inspection scheduled for 2/16. Policyholder contacted and confirmed availability." },
      { claimIdx: 5, author: "Patricia Nguyen", role: "Field Adjuster", content: "Flood damage confirmed. Water line at 26 inches. HVAC and electrical systems compromised." },
      { claimIdx: 7, author: "David Kim", role: "Field Adjuster", content: "Complete roof loss confirmed. Emergency tarping arranged. Family relocated to temporary housing." },
      { claimIdx: 10, author: "Angela Washington", role: "Field Adjuster", content: "Flooding subsided. Property accessible for inspection. Documenting damage to structure and contents." },
    ];

    for (const note of sampleNotes) {
      const claimId = claimsData[note.claimIdx]?.id;
      if (claimId) {
        const noteObj: ClaimNote = {
          id: randomUUID(),
          claimId,
          authorName: note.author,
          authorRole: note.role,
          content: note.content,
          timestamp: "2026-02-13T10:30:00Z",
        };
        this.claimNotes.get(claimId)?.push(noteObj);
      }
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getStormEvents(): Promise<StormEvent[]> {
    return Array.from(this.stormEvents.values());
  }

  async getStormEvent(id: string): Promise<StormEvent | undefined> {
    return this.stormEvents.get(id);
  }

  async getAdjusters(): Promise<Adjuster[]> {
    return Array.from(this.adjusters.values());
  }

  async getAdjuster(id: string): Promise<Adjuster | undefined> {
    return this.adjusters.get(id);
  }

  async getClaims(filter?: ClaimsFilter): Promise<Claim[]> {
    let results = Array.from(this.claims.values());

    if (filter) {
      if (filter.stormEventId) {
        results = results.filter(c => c.stormEventId === filter.stormEventId);
      }
      if (filter.severity) {
        results = results.filter(c => c.severity === filter.severity);
      }
      if (filter.status) {
        results = results.filter(c => c.status === filter.status);
      }
      if (filter.damageType) {
        results = results.filter(c => c.damageType === filter.damageType);
      }
      if (filter.assignedAdjusterId) {
        results = results.filter(c => c.assignedAdjusterId === filter.assignedAdjusterId);
      }
      if (filter.region) {
        results = results.filter(c => c.propertyState === filter.region || c.propertyCity === filter.region);
      }
      if (filter.unassignedOnly) {
        results = results.filter(c => !c.assignedAdjusterId);
      }

      const sortBy = filter.sortBy || "priority";
      const sortOrder = filter.sortOrder || "desc";
      const direction = sortOrder === "desc" ? -1 : 1;

      results.sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;
        switch (sortBy) {
          case "priority":
            aVal = a.priority;
            bVal = b.priority;
            break;
          case "filedDate":
            aVal = a.filedDate;
            bVal = b.filedDate;
            break;
          case "estimatedLoss":
            aVal = a.estimatedLoss || 0;
            bVal = b.estimatedLoss || 0;
            break;
          case "severity": {
            const sevOrder: Record<string, number> = { catastrophic: 4, major: 3, moderate: 2, minor: 1 };
            aVal = sevOrder[a.severity] || 0;
            bVal = sevOrder[b.severity] || 0;
            break;
          }
          default:
            aVal = a.priority;
            bVal = b.priority;
        }
        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
        return 0;
      });
    } else {
      results.sort((a, b) => b.priority - a.priority);
    }

    return results;
  }

  async getClaim(id: string): Promise<Claim | undefined> {
    return this.claims.get(id);
  }

  async getClaimByNumber(claimNumber: string): Promise<Claim | undefined> {
    return Array.from(this.claims.values()).find(c => c.claimNumber === claimNumber);
  }

  async updateClaimStatus(claimId: string, status: ClaimStatus, performedBy?: string, performedByRole?: string): Promise<Claim | undefined> {
    const claim = this.claims.get(claimId);
    if (!claim) return undefined;
    const previousStatus = claim.status;
    claim.status = status;
    claim.lastUpdated = new Date().toISOString().split("T")[0];
    this.claims.set(claimId, claim);

    await this.addClaimActivity({
      claimId,
      previousStatus,
      newStatus: status,
      action: "status_change",
      performedBy: performedBy || "System",
      performedByRole: performedByRole || "system",
      details: `Status changed from ${previousStatus} to ${status}`,
    });

    return claim;
  }

  async assignClaim(claimId: string, adjusterId: string, performedBy?: string): Promise<Claim | undefined> {
    const claim = this.claims.get(claimId);
    const adjuster = this.adjusters.get(adjusterId);
    if (!claim || !adjuster) return undefined;

    const previousStatus = claim.status;
    const wasReassignment = !!claim.assignedAdjusterId;
    const previousAdjusterName = claim.assignedAdjusterName;

    if (claim.assignedAdjusterId) {
      const prevAdj = this.adjusters.get(claim.assignedAdjusterId);
      if (prevAdj) {
        prevAdj.currentCaseload = Math.max(0, prevAdj.currentCaseload - 1);
        if (prevAdj.currentCaseload < prevAdj.maxCaseload && prevAdj.status === "busy") {
          prevAdj.status = "available";
        }
        this.adjusters.set(prevAdj.id, prevAdj);
      }
    }

    claim.assignedAdjusterId = adjusterId;
    claim.assignedAdjusterName = adjuster.name;
    claim.status = claim.status === "new" || claim.status === "triaged" ? "assigned" : claim.status;
    claim.lastUpdated = new Date().toISOString().split("T")[0];
    this.claims.set(claimId, claim);

    adjuster.currentCaseload += 1;
    if (adjuster.currentCaseload >= adjuster.maxCaseload) {
      adjuster.status = "busy";
    }
    this.adjusters.set(adjusterId, adjuster);

    await this.addClaimActivity({
      claimId,
      previousStatus,
      newStatus: claim.status,
      action: wasReassignment ? "reassignment" : "assignment",
      performedBy: performedBy || "Claims Agent",
      performedByRole: "adjuster",
      details: wasReassignment
        ? `Reassigned from ${previousAdjusterName} to ${adjuster.name}`
        : `Assigned to ${adjuster.name}`,
    });

    return claim;
  }

  async bulkAssignClaims(claimIds: string[], adjusterId: string): Promise<Claim[]> {
    const results: Claim[] = [];
    for (const cid of claimIds) {
      const updated = await this.assignClaim(cid, adjusterId);
      if (updated) results.push(updated);
    }
    return results;
  }

  async getClaimNotes(claimId: string): Promise<ClaimNote[]> {
    return this.claimNotes.get(claimId) || [];
  }

  async addClaimNote(note: Omit<ClaimNote, "id" | "timestamp">): Promise<ClaimNote> {
    const newNote: ClaimNote = {
      ...note,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };
    const notes = this.claimNotes.get(note.claimId) || [];
    notes.push(newNote);
    this.claimNotes.set(note.claimId, notes);
    return newNote;
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const allClaims = Array.from(this.claims.values());
    const openStatuses: ClaimStatus[] = ["new", "triaged", "assigned", "inspected", "estimated", "approved"];
    const openClaims = allClaims.filter(c => openStatuses.includes(c.status));
    const unassigned = allClaims.filter(c => !c.assignedAdjusterId && openStatuses.includes(c.status));

    const today = new Date("2026-02-14");
    const totalAgeDays = allClaims.reduce((sum, c) => {
      const filed = new Date(c.filedDate);
      return sum + Math.max(1, Math.floor((today.getTime() - filed.getTime()) / (1000 * 60 * 60 * 24)));
    }, 0);

    const storms = Array.from(this.stormEvents.values());
    const claimsByStorm = storms.map(s => {
      const stormClaims = allClaims.filter(c => c.stormEventId === s.id);
      return {
        stormEventId: s.id,
        stormName: s.name,
        count: stormClaims.length,
        totalLoss: stormClaims.reduce((sum, c) => sum + (c.estimatedLoss || 0), 0),
      };
    });

    const claimsBySeverity = {
      catastrophic: allClaims.filter(c => c.severity === "catastrophic").length,
      major: allClaims.filter(c => c.severity === "major").length,
      moderate: allClaims.filter(c => c.severity === "moderate").length,
      minor: allClaims.filter(c => c.severity === "minor").length,
    };

    const statusValues: ClaimStatus[] = ["new", "triaged", "assigned", "inspected", "estimated", "approved", "settled", "closed", "denied"];
    const claimsByStatus: Record<string, number> = {};
    for (const s of statusValues) {
      claimsByStatus[s] = allClaims.filter(c => c.status === s).length;
    }

    const damageValues = ["wind", "flood", "hail", "fire", "lightning", "debris", "water_damage", "structural", "other"];
    const claimsByDamageType: Record<string, number> = {};
    for (const d of damageValues) {
      claimsByDamageType[d] = allClaims.filter(c => c.damageType === d).length;
    }

    return {
      totalClaims: allClaims.length,
      openClaims: openClaims.length,
      unassignedClaims: unassigned.length,
      avgClaimAgeDays: allClaims.length > 0 ? Math.round(totalAgeDays / allClaims.length) : 0,
      totalEstimatedLoss: allClaims.reduce((sum, c) => sum + (c.estimatedLoss || 0), 0),
      totalApprovedAmount: allClaims.reduce((sum, c) => sum + (c.approvedAmount || 0), 0),
      claimsByStorm,
      claimsBySeverity,
      claimsByStatus: claimsByStatus as DashboardMetrics["claimsByStatus"],
      claimsByDamageType: claimsByDamageType as DashboardMetrics["claimsByDamageType"],
    };
  }

  async getAdjusterWorkload(): Promise<Array<Adjuster & { assignedClaimsCount: number }>> {
    const allClaims = Array.from(this.claims.values());
    return Array.from(this.adjusters.values()).map(adj => ({
      ...adj,
      assignedClaimsCount: allClaims.filter(c => c.assignedAdjusterId === adj.id).length,
    }));
  }

  async getClaimActivity(claimId: string): Promise<ClaimActivity[]> {
    return (this.claimActivity.get(claimId) || []).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async addClaimActivity(activity: Omit<ClaimActivity, "id" | "timestamp">): Promise<ClaimActivity> {
    const newActivity: ClaimActivity = {
      ...activity,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };
    const activities = this.claimActivity.get(activity.claimId) || [];
    activities.push(newActivity);
    this.claimActivity.set(activity.claimId, activities);
    return newActivity;
  }

  async getAllActivity(): Promise<ClaimActivity[]> {
    const all: ClaimActivity[] = [];
    this.claimActivity.forEach((activities) => {
      all.push(...activities);
    });
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export const storage = new MemStorage();
