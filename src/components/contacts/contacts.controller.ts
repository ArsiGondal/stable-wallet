import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContactsService } from './contacts.service';
import { ContactDTO } from './dto/contact.dto';
import { DeleteContactDTO } from './dto/deleteContact.dto';
import { UpdateContactDTO } from './dto/updateContact.dto';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private _contactService: ContactsService) {}

  @Post('createContact')
  createContact(@Body() contactDto: ContactDTO, @User() user) {
    return this._contactService.createContact(contactDto, user);
  }

  @Post('updateContact/:id')
  updateContact(@Param('id') id:string,@Body() updateContactDto: UpdateContactDTO, @User() user) {
    return this._contactService.updateContact(id,updateContactDto, user);
  }

  @Get('getContact/:id')
  getContact(@Param('id') id: string) {
    return this._contactService.getContact(id);
  }

  @Post('deleteContact')
  deleteContact(@Body() deleteContactDto: DeleteContactDTO, @User() user) {
    return this._contactService.deleteContact(
      deleteContactDto.contactAddress,
      user,
    );
  }

  @Get('getAllContacts')
  getAllContacts(@User() user) {
    return this._contactService.getAllContacts(user);
  }
}
