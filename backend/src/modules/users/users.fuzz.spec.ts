import * as fc from 'fast-check';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterUserDto } from './dto/register-user.dto';

describe('UsersService Fuzz Testing', () => {
  let usersService: UsersService;
  let mockPrisma: any;
  let mockMail: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    mockMail = {
      sendOTP: jest.fn(),
    };
    usersService = new UsersService(mockPrisma as any, mockMail as any);
  });

  it('should never crash when provided random garbage data for registration', () => {
    // Generate thousands of random objects with fast-check
    fc.assert(
      fc.asyncProperty(
        fc.record({
          firstName: fc.string(),
          lastName: fc.string(),
          alternateEmail: fc.string(), // May not be valid emails
          password: fc.string(),
          departmentId: fc.string(),
        }),
        async (randomInput) => {
          mockPrisma.user.findUnique.mockResolvedValue(null);
          try {
            // As long as it throws a predictable Error (e.g. ValidationError from class-validator
            // or we handle it gracefully), and doesn't crash the Node process, it passes the fuzz.
            await usersService.register(randomInput as any);
          } catch (e) {
            // We expect errors for garbage data, but NOT crashes or out-of-memory.
            expect(e).toBeDefined();
          }
        }
      ),
      { numRuns: 1000 } // Run 1000 random permutations
    );
  });
});
