import { Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class VisitedUrl {
    @PrimaryColumn()
      url: string;
}
