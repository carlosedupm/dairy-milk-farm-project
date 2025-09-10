package com.ceialmilk.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.ceialmilk.dto.FazendaCreateDTO;
import com.ceialmilk.dto.FazendaResponseDTO;
import com.ceialmilk.dto.FazendaSummaryDTO;
import com.ceialmilk.model.Fazenda;

@Mapper(componentModel = "spring")
public interface FazendaMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Fazenda toEntity(FazendaCreateDTO dto);

    FazendaResponseDTO toResponseDTO(Fazenda entity);

    FazendaSummaryDTO toSummaryDTO(Fazenda entity);

    java.util.List<FazendaSummaryDTO> toSummaryDTOList(java.util.List<Fazenda> entities);
}
