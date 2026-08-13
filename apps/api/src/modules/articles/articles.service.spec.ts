import type { PrismaService } from '../../core/database/prisma.service';
import { ArticlesService } from './articles.service';

describe('ArticlesService', () => {
  it('liest eingebettete Dateidaten nicht für die Artikelliste aus der Datenbank', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { article: { findMany } } as unknown as PrismaService;

    await new ArticlesService(prisma).list();

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      omit: { files: true },
      include: expect.objectContaining({
        variantLinks: expect.objectContaining({
          include: { variantArticle: expect.objectContaining({ omit: { files: true } }) },
        }),
      }),
    }));
  });
});
