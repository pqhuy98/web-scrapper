import { Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class DomainName {
    @PrimaryColumn()
      domainName: string;
}
