import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact } from './interface/contact.interface';
const Web3 = require('web3');

@Injectable()
export class ContactsService {
  private web3;
  constructor(
    @InjectModel('Contact') private readonly _contactModel: Model<Contact>,
  ) {
    this.web3 = new Web3(process.env.POLYGON_RPC);
  }

  async createContact(contactDto, user) {
    try {
      const contacts = await this._contactModel.findOne({
        userID: user.id,
        contactAddress: new RegExp(contactDto?.contactAddress, 'i'),
        isDeleted: false,
      });

      if (contacts) {
        throw new Error('Address already exists!');
      }

      const isValidAddress = this.web3.utils.isAddress(
        contactDto.contactAddress,
      );

      if (!isValidAddress) {
        throw new Error('Invalid Address');
      }

      const contact = await new this._contactModel({
        ...contactDto,
        userID: user.id,
        isDeleted: false,
      }).save();

      return contact;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async updateContact(id, updateContactDto, user) {
    try {
      if (updateContactDto?.contactAddress) {
        const isValidAddress = this.web3.utils.isAddress(
          updateContactDto.contactAddress,
        );

        if (!isValidAddress) {
          throw new Error('Invalid Address');
        }

        const contacts = await this._contactModel.findOne({
          userID: user.id,
          contactAddress: new RegExp(updateContactDto?.contactAddress, 'i'),
          isDeleted: false,
          _id: { $ne: id },
        });

        if (contacts) {
          throw new Error('Address already exists!');
        }
      }

      const contact = await this._contactModel.updateOne(
        {
          _id: id,
          userID: user.id,
          isDeleted: false,
        },
        updateContactDto,
      );

      return { message: 'Contact Updated Successfully!' };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getContact(id) {
    try {
      const contact = await this._contactModel.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!contact) {
        throw new Error('No contact found!');
      }

      return contact;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async deleteContact(contactAddress, user) {
    try {
      const contact = await this._contactModel.updateOne(
        { contactAddress: contactAddress, userID: user.id, isDeleted: false },
        { isDeleted: true },
      );

      return { message: 'Contact Deleted Successfully!' };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getAllContacts(user) {
    try {
      const contacts = await this._contactModel.aggregate([
        {
          $match: {
            userID: user.id,
            isDeleted: false,
          },
        },
        {
          $addFields: {
            id: '$_id',
          },
        },
        {
          $project: {
            _id: 0,
          },
        },
        {
          $project: {
            id: 1,
            contactName: 1,
            contactAddress: 1,
          },
        },
      ]);

      return contacts;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }
}
