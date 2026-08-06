import { db } from "../src/lib/db";
import { ActivityType, DealStage, TaskType } from "../src/generated/prisma/client";

function daysFromNow(days: number) {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

async function main() {
  console.log("Clearing existing data…");
  await db.activity.deleteMany();
  await db.task.deleteMany();
  await db.deal.deleteMany();
  await db.contact.deleteMany();
  await db.company.deleteMany();

  console.log("Seeding companies…");
  const [acme, globex, initech, umbrella, hooli] = await Promise.all([
    db.company.create({
      data: {
        name: "Acme Inc.",
        domain: "acme.com",
        industry: "Manufacturing",
        phone: "+1 415 555 0100",
        address: "100 Market St, San Francisco, CA",
      },
    }),
    db.company.create({
      data: {
        name: "Globex Corporation",
        domain: "globex.com",
        industry: "Logistics",
        phone: "+1 212 555 0133",
        address: "44 Wall St, New York, NY",
      },
    }),
    db.company.create({
      data: {
        name: "Initech",
        domain: "initech.com",
        industry: "Software",
        phone: "+1 512 555 0166",
        address: "2000 Congress Ave, Austin, TX",
      },
    }),
    db.company.create({
      data: {
        name: "Umbrella Health",
        domain: "umbrella-health.com",
        industry: "Healthcare",
        phone: "+1 312 555 0188",
        address: "1 Wacker Dr, Chicago, IL",
      },
    }),
    db.company.create({
      data: {
        name: "Hooli",
        domain: "hooli.com",
        industry: "Technology",
        phone: "+1 650 555 0122",
        address: "1 Hacker Way, Palo Alto, CA",
      },
    }),
  ]);

  console.log("Seeding contacts…");
  const [sarah, michael, priya, david, elena, marcus, aisha, tom] =
    await Promise.all([
      db.contact.create({
        data: {
          firstName: "Sarah",
          lastName: "Chen",
          email: "sarah.chen@acme.com",
          phone: "+1 415 555 0101",
          title: "VP of Operations",
          companyId: acme.id,
        },
      }),
      db.contact.create({
        data: {
          firstName: "Michael",
          lastName: "Rodriguez",
          email: "m.rodriguez@acme.com",
          phone: "+1 415 555 0102",
          title: "Procurement Manager",
          companyId: acme.id,
        },
      }),
      db.contact.create({
        data: {
          firstName: "Priya",
          lastName: "Patel",
          email: "priya.patel@globex.com",
          phone: "+1 212 555 0134",
          title: "Director of Logistics",
          companyId: globex.id,
        },
      }),
      db.contact.create({
        data: {
          firstName: "David",
          lastName: "Kim",
          email: "david.kim@initech.com",
          phone: "+1 512 555 0167",
          title: "CTO",
          companyId: initech.id,
        },
      }),
      db.contact.create({
        data: {
          firstName: "Elena",
          lastName: "Volkov",
          email: "elena.volkov@initech.com",
          phone: "+1 512 555 0168",
          title: "Head of Engineering",
          companyId: initech.id,
        },
      }),
      db.contact.create({
        data: {
          firstName: "Marcus",
          lastName: "Johnson",
          email: "marcus.johnson@umbrella-health.com",
          phone: "+1 312 555 0189",
          title: "IT Director",
          companyId: umbrella.id,
        },
      }),
      db.contact.create({
        data: {
          firstName: "Aisha",
          lastName: "Abdullah",
          email: "aisha.abdullah@hooli.com",
          phone: "+1 650 555 0123",
          title: "VP of Product",
          companyId: hooli.id,
        },
      }),
      db.contact.create({
        data: {
          firstName: "Tom",
          lastName: "Whitfield",
          email: "tom.whitfield@gmail.com",
          phone: "+1 917 555 0199",
          title: "Independent Consultant",
        },
      }),
    ]);

  console.log("Seeding deals…");
  const deals = await Promise.all([
    db.deal.create({
      data: {
        title: "Acme Inc. — Annual supply contract",
        value: 84000,
        stage: DealStage.NEGOTIATION,
        expectedCloseDate: daysFromNow(12),
        companyId: acme.id,
        contactId: sarah.id,
        notes: "Final pricing review scheduled. Legal reviewing MSA redlines.",
      },
    }),
    db.deal.create({
      data: {
        title: "Acme Inc. — Warehouse automation add-on",
        value: 21000,
        stage: DealStage.PROPOSAL,
        expectedCloseDate: daysFromNow(25),
        companyId: acme.id,
        contactId: michael.id,
      },
    }),
    db.deal.create({
      data: {
        title: "Globex Corporation — Fleet tracking platform",
        value: 156000,
        stage: DealStage.QUALIFIED,
        expectedCloseDate: daysFromNow(40),
        companyId: globex.id,
        contactId: priya.id,
        notes: "Champion identified. Needs budget sign-off from CFO in Q3.",
      },
    }),
    db.deal.create({
      data: {
        title: "Initech — Enterprise platform migration",
        value: 240000,
        stage: DealStage.NEGOTIATION,
        expectedCloseDate: daysFromNow(8),
        companyId: initech.id,
        contactId: david.id,
        notes: "Security review complete. Awaiting procurement approval.",
      },
    }),
    db.deal.create({
      data: {
        title: "Initech — Developer tooling seats",
        value: 18000,
        stage: DealStage.WON,
        expectedCloseDate: daysFromNow(-5),
        companyId: initech.id,
        contactId: elena.id,
      },
    }),
    db.deal.create({
      data: {
        title: "Umbrella Health — Compliance suite",
        value: 62000,
        stage: DealStage.LEAD,
        expectedCloseDate: daysFromNow(60),
        companyId: umbrella.id,
        contactId: marcus.id,
      },
    }),
    db.deal.create({
      data: {
        title: "Hooli — Company-wide rollout",
        value: 310000,
        stage: DealStage.QUALIFIED,
        expectedCloseDate: daysFromNow(35),
        companyId: hooli.id,
        contactId: aisha.id,
        notes: "Pilot with 50 seats went well. Scoping full rollout.",
      },
    }),
    db.deal.create({
      data: {
        title: "Hooli — Legacy system replacement",
        value: 45000,
        stage: DealStage.LOST,
        expectedCloseDate: daysFromNow(-20),
        companyId: hooli.id,
        notes: "Lost to a competitor on price.",
      },
    }),
    db.deal.create({
      data: {
        title: "Whitfield Consulting — Advisory retainer",
        value: 9000,
        stage: DealStage.PROPOSAL,
        expectedCloseDate: daysFromNow(15),
        contactId: tom.id,
      },
    }),
  ]);

  const [
    acmeSupply,
    ,
    globexFleet,
    initechMigration,
    ,
    umbrellaCompliance,
    hooliRollout,
  ] = deals;

  console.log("Seeding tasks…");
  await Promise.all([
    db.task.create({
      data: {
        title: "Send updated MSA redlines to legal",
        type: TaskType.FOLLOW_UP,
        dueDate: daysFromNow(-1),
        companyId: acme.id,
        contactId: sarah.id,
        dealId: acmeSupply.id,
      },
    }),
    db.task.create({
      data: {
        title: "Call Sarah to confirm final pricing",
        type: TaskType.CALL,
        dueDate: daysFromNow(0),
        companyId: acme.id,
        contactId: sarah.id,
        dealId: acmeSupply.id,
      },
    }),
    db.task.create({
      data: {
        title: "Prep fleet tracking demo deck",
        type: TaskType.MEETING,
        dueDate: daysFromNow(2),
        companyId: globex.id,
        contactId: priya.id,
        dealId: globexFleet.id,
      },
    }),
    db.task.create({
      data: {
        title: "Email David the security review summary",
        type: TaskType.EMAIL,
        dueDate: daysFromNow(0),
        companyId: initech.id,
        contactId: david.id,
        dealId: initechMigration.id,
      },
    }),
    db.task.create({
      data: {
        title: "Check in on procurement approval status",
        type: TaskType.FOLLOW_UP,
        dueDate: daysFromNow(5),
        companyId: initech.id,
        dealId: initechMigration.id,
      },
    }),
    db.task.create({
      data: {
        title: "Introduce compliance suite to Marcus",
        type: TaskType.CALL,
        dueDate: daysFromNow(3),
        companyId: umbrella.id,
        contactId: marcus.id,
        dealId: umbrellaCompliance.id,
      },
    }),
    db.task.create({
      data: {
        title: "Scope full rollout pricing for Hooli",
        type: TaskType.OTHER,
        dueDate: daysFromNow(7),
        companyId: hooli.id,
        contactId: aisha.id,
        dealId: hooliRollout.id,
      },
    }),
    db.task.create({
      data: {
        title: "Send onboarding guide to Elena",
        type: TaskType.EMAIL,
        dueDate: daysFromNow(-3),
        completed: true,
        completedAt: daysFromNow(-3),
        companyId: initech.id,
        contactId: elena.id,
      },
    }),
    db.task.create({
      data: {
        title: "Quarterly check-in with Tom Whitfield",
        type: TaskType.CALL,
        dueDate: daysFromNow(10),
        contactId: tom.id,
      },
    }),
    db.task.create({
      data: {
        title: "Add Priya to product roadmap briefing list",
        type: TaskType.OTHER,
        completed: true,
        completedAt: daysFromNow(-7),
        contactId: priya.id,
      },
    }),
  ]);

  console.log("Seeding activity…");
  await Promise.all([
    db.activity.create({
      data: {
        type: ActivityType.NOTE,
        content: "Great first call — Sarah is the economic buyer and wants to close before quarter end.",
        companyId: acme.id,
        contactId: sarah.id,
        dealId: acmeSupply.id,
      },
    }),
    db.activity.create({
      data: {
        type: ActivityType.CALL,
        content: "30-min call with Priya to walk through fleet tracking requirements. Needs integration with their existing ELD system.",
        companyId: globex.id,
        contactId: priya.id,
        dealId: globexFleet.id,
      },
    }),
    db.activity.create({
      data: {
        type: ActivityType.EMAIL,
        content: "Sent security questionnaire responses to David's infosec team.",
        companyId: initech.id,
        contactId: david.id,
        dealId: initechMigration.id,
      },
    }),
    db.activity.create({
      data: {
        type: ActivityType.MEETING,
        content: "On-site demo with the Hooli product team. Strong interest from 3 department leads.",
        companyId: hooli.id,
        contactId: aisha.id,
        dealId: hooliRollout.id,
      },
    }),
    db.activity.create({
      data: {
        type: ActivityType.NOTE,
        content: "Tom is exploring a retainer for advisory work with 2 of his clients too — potential for expansion.",
        contactId: tom.id,
      },
    }),
  ]);

  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
