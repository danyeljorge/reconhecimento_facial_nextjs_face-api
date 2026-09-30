/**
 * PERSON REPOSITORY (Legacy compatibility)
 * Isola o acesso à tabela Person do Prisma.
 */

import { prisma } from "@/lib/prisma";

export interface IPersonRepository {
  count(): Promise<number>;
  listAll(): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  create(data: { name: string; faceDescriptor: string }): Promise<any>;
  updateName(id: string, name: string): Promise<any>;
  deleteById(id: string): Promise<boolean>;
  findFirstLatest(): Promise<any | null>;
  getAllWithDescriptors(): Promise<any[]>;
}

export class PersonRepositoryPrisma implements IPersonRepository {
  async count(): Promise<number> {
    return prisma.person.count();
  }

  async listAll(): Promise<any[]> {
    return prisma.person.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string): Promise<any | null> {
    return prisma.person.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(data: { name: string; faceDescriptor: string }): Promise<any> {
    return prisma.person.create({
      data: {
        name: data.name,
        faceDescriptor: data.faceDescriptor,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });
  }

  async updateName(id: string, name: string): Promise<any> {
    return prisma.person.update({
      where: { id },
      data: { name },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteById(id: string): Promise<boolean> {
    try {
      await prisma.person.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async findFirstLatest(): Promise<any | null> {
    return prisma.person.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
  }

  async getAllWithDescriptors(): Promise<any[]> {
    return prisma.person.findMany({
      select: {
        id: true,
        name: true,
        faceDescriptor: true,
        createdAt: true,
      },
    });
  }
}

export const personRepository: IPersonRepository = new PersonRepositoryPrisma();
