import { Complaint } from '@prisma/client';

export interface ComplaintSiteSearch<T = Complaint> {
    // O que o visitante digitou, de volta, a tela repete o endereço verificado.
    query: string;
    // Host de fato pesquisado, depois de tirar protocolo, www, porta e caminho.
    domain: string;
    found: boolean;
    total: number;
    data: T[];
}
