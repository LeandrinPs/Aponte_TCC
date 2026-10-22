 let map, infoWindow;

        function initMap() {
            map = new google.maps.Map(
                document.getElementById("map"),
                {
                    center: { lat: -67.000, lng: 67.000 },
                    zoom: 10
                }
            );

            infoWindow = new google.maps.InfoWindow();

            const locationButton = document.createElement("button");

            locationButton.textContent = "Minha localização";
            locationButton.classList.add("custom-map-control-button");

            map.controls[google.maps.ControlPosition.TOP_CENTER]
                .push(locationButton);

            locationButton.addEventListener("click", () => {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const pos = {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                            };

                            infoWindow.setPosition(pos);
                            infoWindow.setContent("Sua localização");
                            infoWindow.open({ map });

                            map.setCenter(pos);
                            map.setZoom(15);
                        },
                        () => {
                            handleLocationError(true);
                        }
                    );
                } else {
                    handleLocationError(false);
                }
            });
        }

        function handleLocationError(browserHasGeolocation) {
            infoWindow.setPosition(map.getCenter());

            infoWindow.setContent(
                browserHasGeolocation
                    ? "Erro: não foi possível obter sua localização."
                    : "Seu navegador não suporta geolocalização."
            );

            infoWindow.open({ map });
        }

        window.initMap = initMap;