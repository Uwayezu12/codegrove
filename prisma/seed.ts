import 'dotenv/config';
import {PrismaClient,Prisma} from '@prisma/client';
import {topics,lessons,courses,problems,questions} from '../frontend/app/data';
const db=new PrismaClient();
const json=(x:unknown)=>JSON.parse(JSON.stringify(x)) as Prisma.InputJsonValue;
try{await db.$transaction(async tx=>{
for(const [position,t] of topics.entries())await tx.topic.upsert({where:{id:t.id},create:{id:t.id,position,content:json(t)},update:{}});
for(const [position,l] of lessons.entries())await tx.lesson.upsert({where:{id:l.id},create:{id:l.id,topicId:l.topic,position,content:json(l)},update:{}});
for(const [position,c] of courses.entries()){const existing=await tx.course.findUnique({where:{id:c.id}});if(!existing){const {lessons:ids,...content}=c;await tx.course.create({data:{id:c.id,topicId:c.topic,position,content:json(content),lessons:{create:ids.map((lessonId,position)=>({lessonId,position}))}}});}}
for(const [position,e] of problems.entries())await tx.exercise.upsert({where:{id:e.id},create:{id:e.id,position,content:json(e)},update:{}});
await tx.quiz.upsert({where:{id:'fundamentals'},create:{id:'fundamentals',questions:json(questions)},update:{}});
},{timeout:60000});console.log('Original CodeGrove catalog seeded. Existing content and user progress were preserved.');}finally{await db.$disconnect();}
