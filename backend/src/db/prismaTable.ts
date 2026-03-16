import prisma from "./prisma.js";

type BaseEntity = {
  id: string;
};

type InsertInput<T extends BaseEntity> = Omit<T, "id"> & Partial<Pick<T, "id">>;
type UpdateInput<T extends BaseEntity> = Partial<Omit<T, "id">>;

export class PrismaTable<T extends BaseEntity> {
  private readonly model: any;

  constructor(modelName: string) {
    this.model = (prisma as any)[modelName];
    if (!this.model) {
      throw new Error(`Prisma model ${modelName} not found`);
    }
  }

  async getAll(): Promise<T[]> {
    return this.model.findMany();
  }

  async getById(id: string): Promise<T | undefined> {
    const record = await this.model.findUnique({ where: { id } });
    return record ?? undefined;
  }

  async insert(input: InsertInput<T>): Promise<T> {
    return this.model.create({
      data: input
    });
  }

  async update(id: string, updates: UpdateInput<T>): Promise<T> {
    return this.model.update({
      where: { id },
      data: updates
    });
  }

  async delete(id: string): Promise<void> {
    await this.model.delete({ where: { id } });
  }

  async find(filter: Partial<T>): Promise<T[]> {
    return this.model.findMany({ where: filter });
  }

  async findOne(filter: Partial<T>): Promise<T | undefined> {
    const record = await this.model.findFirst({ where: filter });
    return record ?? undefined;
  }

  async findById(id: string): Promise<T | undefined> {
    return this.getById(id);
  }

  // Compat for legacy code that might call reload
  async reload(): Promise<void> {
    return;
  }
}

export const createPrismaTable = <T extends BaseEntity>(modelName: string) =>
  new PrismaTable<T>(modelName);
