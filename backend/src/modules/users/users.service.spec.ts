import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from '../auth/otp.service';
import { ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';

jest.mock('argon2');

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: jest.Mocked<PrismaService>;
  let otpService: jest.Mocked<OtpService>;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      department: {
        findUnique: jest.fn(),
      }
    };

    const mockOtpService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OtpService, useValue: mockOtpService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
    otpService = module.get(OtpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ConflictException if user already exists', async () => {
    const createUserDto = {
      alternateEmail: 'test@example.com',
      password: 'password',
      firstName: 'Test',
      lastName: 'User',
      otp: '123456',
    };

    (otpService.verify as jest.Mock).mockResolvedValueOnce(true);
    (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: '1', alternateEmail: 'test@example.com' });

    await expect(service.create(createUserDto as any)).rejects.toThrow(ConflictException);
  });

  it('should create a user if email is unique and OTP is verified', async () => {
    const createUserDto = {
      alternateEmail: 'test@example.com',
      password: 'password',
      firstName: 'Test',
      lastName: 'User',
      otp: '123456',
    };

    (otpService.verify as jest.Mock).mockResolvedValueOnce(true);
    (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (argon2.hash as jest.Mock).mockResolvedValueOnce('hashed_password');
    (prismaService.user.create as jest.Mock).mockResolvedValueOnce({
      id: '1',
      ...createUserDto,
      passwordHash: 'hashed_password'
    });

    const result = await service.create(createUserDto as any);

    expect(result).toHaveProperty('id');
    expect(prismaService.user.create).toHaveBeenCalledWith({
      data: {
        alternateEmail: 'test@example.com',
        departmentId: null,
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashed_password',
        role: 'APPLICANT',
      },
      select: expect.any(Object)
    });
  });
});
