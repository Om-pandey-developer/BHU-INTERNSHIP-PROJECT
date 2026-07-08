import { Controller, Get, Post, Patch, Body, Param, UseGuards, BadRequestException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GoogleWorkspaceService } from '../google-workspace/google-workspace.service';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';

@Controller('api/v1/admin/users/hod-dean')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CC_ADMIN)
export class UsersAdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly workspaceService: GoogleWorkspaceService,
    private readonly mailService: MailService,
  ) {}

  @Get()
  async getHodsAndDeans() {
    return this.usersService.getUsersByRoles([Role.HOD, Role.DEAN]);
  }

  @Post()
  async createHodOrDean(
    @Body() body: {
      firstName: string;
      lastName: string;
      designationEmail: string; // e.g., hod.cs@bhu.ac.in
      personalEmail: string;
      role: Role; // HOD or DEAN
      departmentId: string;
      roleExpiryDate: string;
    },
  ) {
    if (body.role !== Role.HOD && body.role !== Role.DEAN) {
      throw new BadRequestException('Role must be HOD or DEAN');
    }

    // 1. Create the user in database
    const newUser = await this.usersService.createAdminUser({
      firstName: body.firstName,
      lastName: body.lastName,
      alternateEmail: body.personalEmail,
      bhuEmail: body.designationEmail,
      role: body.role,
      departmentId: body.departmentId,
      roleExpiryDate: new Date(body.roleExpiryDate),
    });

    // 2. Provision Designation Email in Workspace (20GB)
    await this.workspaceService.provisionDesignationEmail(body.designationEmail, 20);

    // 3. Generate secure reset token and send Welcome Mail
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Save token in DB (we can use usersService.saveResetToken, assuming it exists)
    await this.usersService.savePasswordResetToken(newUser.id, resetToken);

    await this.mailService.sendHodWelcomeMail(
      body.personalEmail,
      `${body.firstName} ${body.lastName}`,
      body.designationEmail,
      resetToken,
      body.role,
    );

    return { message: `${body.role} created and provisioned successfully.`, user: newUser };
  }

  @Patch(':id')
  async updateHodOrDean(
    @Param('id') id: string,
    @Body() body: {
      firstName?: string;
      lastName?: string;
      personalEmail?: string;
      roleExpiryDate?: string;
    },
  ) {
    const data: any = {};
    if (body.firstName) data.firstName = body.firstName;
    if (body.lastName) data.lastName = body.lastName;
    if (body.personalEmail) data.alternateEmail = body.personalEmail;
    if (body.roleExpiryDate) data.roleExpiryDate = new Date(body.roleExpiryDate);

    const updatedUser = await this.usersService.updateUser(id, data);
    return { message: 'Details updated successfully.', user: updatedUser };
  }

  @Post(':id/reset-password')
  async sendResetCredentials(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new BadRequestException('User not found');

    const resetToken = crypto.randomBytes(32).toString('hex');
    await this.usersService.savePasswordResetToken(user.id, resetToken);

    await this.mailService.sendHodWelcomeMail(
      user.alternateEmail,
      `${user.firstName} ${user.lastName}`,
      user.bhuEmail || 'N/A',
      resetToken,
      user.role,
    );

    return { message: 'Password reset link sent successfully to personal email.' };
  }

  // ════════════════════════════════════════════
  // BULK UPLOAD HOD/DEAN VIA CSV
  // ════════════════════════════════════════════

  /**
   * POST /api/v1/admin/users/hod-dean/bulk-upload
   * Upload a CSV file to create multiple HOD/Dean accounts at once.
   *
   * CSV Format (columns):
   *   firstName, lastName, personalEmail, designationEmail, role, departmentCode, roleExpiryDate
   *
   * Example row:
   *   Rajesh,Kumar,rajesh.kumar@gmail.com,hod.physics@bhu.ac.in,HOD,PHYSICS,2028-06-30
   */
  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('CSV file is required.');
    }

    const csvContent = file.buffer.toString('utf-8');
    const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
      throw new BadRequestException('CSV must contain a header row and at least one data row.');
    }

    // Parse header
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const requiredColumns = ['firstname', 'lastname', 'personalemail', 'role', 'departmentcode'];
    for (const col of requiredColumns) {
      if (!header.includes(col)) {
        throw new BadRequestException(`CSV is missing required column: "${col}". Required: ${requiredColumns.join(', ')}`);
      }
    }

    const results: { row: number; email: string; status: string; error?: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      header.forEach((key, idx) => {
        row[key] = values[idx] || '';
      });

      try {
        // Validate role
        const role = row['role']?.toUpperCase();
        if (role !== 'HOD' && role !== 'DEAN') {
          throw new Error(`Invalid role "${row['role']}". Must be HOD or DEAN.`);
        }

        // Find department by code
        const { PrismaService } = await import('../../prisma/prisma.service');
        const dept = await this.usersService['prisma'].department.findUnique({
          where: { code: row['departmentcode'].toUpperCase() },
        });
        if (!dept) {
          throw new Error(`Department with code "${row['departmentcode']}" not found.`);
        }

        // Create user with dummy password and requiresPasswordChange = true
        const newUser = await this.usersService.createAdminUser({
          firstName: row['firstname'],
          lastName: row['lastname'],
          alternateEmail: row['personalemail'],
          bhuEmail: row['designationemail'] || null,
          role: role as Role,
          departmentId: dept.id,
          roleExpiryDate: row['roleexpirydate'] ? new Date(row['roleexpirydate']) : null,
        });

        // Generate reset token and send welcome email
        const resetToken = crypto.randomBytes(32).toString('hex');
        await this.usersService.savePasswordResetToken(newUser.id, resetToken);

        try {
          await this.mailService.sendHodWelcomeMail(
            row['personalemail'],
            `${row['firstname']} ${row['lastname']}`,
            row['designationemail'] || 'N/A',
            resetToken,
            role as Role,
          );
        } catch {
          // Email failure shouldn't block account creation
        }

        results.push({ row: i + 1, email: row['personalemail'], status: 'SUCCESS' });
      } catch (err: any) {
        results.push({ row: i + 1, email: row['personalemail'] || 'N/A', status: 'FAILED', error: err.message });
      }
    }

    const successCount = results.filter((r) => r.status === 'SUCCESS').length;
    const failCount = results.filter((r) => r.status === 'FAILED').length;

    return {
      message: `Bulk upload completed. ${successCount} created, ${failCount} failed.`,
      total: lines.length - 1,
      success: successCount,
      failed: failCount,
      details: results,
    };
  }
}
