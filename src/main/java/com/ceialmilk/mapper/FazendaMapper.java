package com.ceialmilk.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import com.ceialmilk.dto.FazendaCreateDTO;
import com.ceialmilk.dto.FazendaResponseDTO;
import com.ceialmilk.dto.FazendaSummaryDTO;
import com.ceialmilk.model.Fazenda;

@Mapper(componentModel = "spring")
public interface FazendaMapper {
    FazendaMapper INSTANCE = Mappers.getMapper(FazendaMapper.class);

    // Métodos de mapeamento removidos pois o Service agora lida diretamente com Optionals

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Fazenda toEntity(FazendaCreateDTO dto);

    // Removido o mapeamento para FazendaUpdateDTO pois as atualizações
    // são tratadas diretamente no Service

    FazendaResponseDTO toResponseDTO(Fazenda entity);

    FazendaSummaryDTO toSummaryDTO(Fazenda entity);
}
