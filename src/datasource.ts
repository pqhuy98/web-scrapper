import { DataSource } from 'typeorm';

import { DomainName } from './entity/domain_name.entity';
import { VisitedUrl } from './entity/visited_url.entity';

export const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'web-scrapper',
  entities: [DomainName, VisitedUrl],
  logging: false,
  synchronize: true,
});
