import { ApiProperty } from "@nestjs/swagger";

export class RpcCallDTO {
    @ApiProperty()
    chainID: string;
    
    @ApiProperty()
    methodName: string;
    
    @ApiProperty()
    senderAddress: string;
}