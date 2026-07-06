import { Controller, Get, Post, Patch, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
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
}
