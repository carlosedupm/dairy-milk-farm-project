package service

import "time"

// diasLactacaoCivis calcula dias completos entre início e fim (datas civis, fim inclusivo no último dia de lactação).
func diasLactacaoCivis(inicio, fim time.Time) int {
	start := time.Date(inicio.Year(), inicio.Month(), inicio.Day(), 0, 0, 0, 0, time.UTC)
	end := time.Date(fim.Year(), fim.Month(), fim.Day(), 0, 0, 0, 0, time.UTC)
	if end.Before(start) {
		return 0
	}
	return int(end.Sub(start).Hours()/24) + 1
}
