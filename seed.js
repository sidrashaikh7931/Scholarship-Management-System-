const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Scholarship = require('./models/Scholarship');

dotenv.config({ path: require('path').join(__dirname, '..', '.env') });

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    await Scholarship.deleteMany({});
    const Application = require('./models/Application');
    await Application.deleteMany({});

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@scholarship.com',
      password: 'admin123',
      role: 'admin',
      phone: '9999999999'
    });

    await User.create({
      name: 'Rahul Sharma',
      email: 'rahul@student.com',
      password: 'student123',
      role: 'student',
      phone: '9876543210',
      address: 'Mumbai, Maharashtra'
    });

    await Scholarship.insertMany([
      {
        title: 'National Merit Scholarship',
        description: 'Prestigious scholarship for students with exceptional academic excellence. Covers full tuition and monthly stipend.',
        eligibility: 'Students with GPA above 3.8 in undergraduate programs, no active backlogs.',
        deadline: new Date('2026-08-31'),
        amount: 50000,
        requiredDocuments: ['Transcript', 'ID Proof', 'Income Certificate'],
        createdBy: admin._id
      },
      {
        title: 'Women in STEM Scholarship',
        description: 'Empowering women in Science, Technology, Engineering, and Mathematics with financial support and mentorship.',
        eligibility: 'Female students in STEM programs with minimum GPA of 3.5.',
        deadline: new Date('2026-09-15'),
        amount: 75000,
        requiredDocuments: ['Transcript', 'ID Proof', 'Essay', 'Recommendation Letter'],
        createdBy: admin._id
      },
      {
        title: 'Community Service Award',
        description: 'Recognizing students with significant community contributions through volunteer work and social initiatives.',
        eligibility: 'Undergraduate with 100+ hours community service and GPA 3.0+.',
        deadline: new Date('2026-07-20'),
        amount: 30000,
        requiredDocuments: ['Transcript', 'Community Service Certificate', 'Recommendation Letter'],
        createdBy: admin._id
      },
      {
        title: 'Innovation & Research Grant',
        description: 'Supporting student-led research projects with real-world impact potential. Funds materials, equipment, and conferences.',
        eligibility: 'Graduate or final-year undergraduate with approved research proposal.',
        deadline: new Date('2026-10-01'),
        amount: 100000,
        requiredDocuments: ['Research Proposal', 'Faculty Approval', 'Transcript'],
        createdBy: admin._id
      },
      {
        title: 'First-Generation Student Scholarship',
        description: 'Dedicated to first-in-family college students. Provides financial support for academic success.',
        eligibility: 'First-generation college students with family income below 5 LPA, GPA 2.5+.',
        deadline: new Date('2026-08-15'),
        amount: 40000,
        requiredDocuments: ['Income Certificate', 'Family Declaration', 'Transcript', 'ID Proof'],
        createdBy: admin._id
      }
    ]);

    console.log('Seed complete!');
    console.log('Admin: admin@scholarship.com / admin123');
    console.log('Student: rahul@student.com / student123');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
