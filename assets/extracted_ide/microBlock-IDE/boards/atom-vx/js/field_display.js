'use strict';

const defaultImage = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCACAAKADASIAAhEBAxEB/8QAHQAAAgIDAQEBAAAAAAAAAAAAAAEHCAIGCQUDBP/EAEcQAAIBAgUCBQICBQcICwAAAAECAwQRAAUGEiEHEwgUIjFBMlFhcQkVI0KBFiQzUpGSoRc0Y3OxwdHTGSUnQ2JkcpSisuH/xAAcAQABBQEBAQAAAAAAAAAAAAAAAwQFBgcBAgj/xAA8EQABAgUDAQQIAwUJAAAAAAABAhEAAwQFIRIxQVEGE2FxByIygZGhwfAUsdEVFkJSciMkMzQ1c7Lh8f/aAAwDAQACEQMRAD8AoS8kwqwoDdu/9XjC7s/m9tm7e6308Ww3M/mxbd27j44wrz+b/f7e77cWwQQJJOasqQ3b3Ee3FsKnlnaazhtvPuuJB8PmlKfXHW7TGS5rG02V1FYzzREemRERpNh/Btlj+BOOmmpM80vojLKeHNfLUNFOGghpkpi4cBCzKsaKSQFBJAHsDjOe0vbAdn6uVRS6czlrGpgWw5GMKc4MTdDbfxktU1S9IBb7yI5FU8s7SNvDW2m11+cFNLOxfeG4W4uvzjoppjpv0VoNajVOS01FMwmO5KicpSUh7DziaKJxZgUjZlYXQAMVtt4lCHqzomoFIRmsCNVO6RpNTyRuNiq7M6soKIFdWLsAtmBvY4gav0imWoJpaCYvDl/VIOcMEq4ByW6s2Ydy7KFB5k4Dyz9RHJuCWdkk3hrhSRcfOCKWcwylg24AbeMdetK6t0/rWmnmyWpirEgZVlUwtG6blDKSrqGsykEG1iPYnEKeNLTg1NpHReSxzLQtmWpaak8wIt3a7kci7rcXte9ri9sdtPpCXcrnKti6Iy1LLZXkYfYoH5iEq21y6KkmVipzpQCTjgb7ExzwSWc08pIbeCNvGBZZ/LsbNv32Hp+MW1pPARV1Va9EmuQzmxEn6q9h9/6bG0wfoza6WlLnqGUjJv3myQhQPzNRbG0yJMypVMTKS+g6TwxG4csD7njLqDtdZbnL72kn6k9dKx+aRFIe7P5a9m37rfT8YbSzimUgNv3c+n4xcnMvAFkGSRlMw625XTSXvYZWJW/KyVDYWmv0fMOuKk0mnuolZX9r1TV0mmzDTRj4u7VNzf4ABJx2bJXIQZkzAG5cfrEwi70UxQSmY5Pgf0imzy1AgiIDbyxv6cKWWcQxFQ24g7vTi2uq/wBHjqrJA9PR6qoZ62K57dbSvThx8WZS9x+OIC6k9F9cdLVj/X2T1ENOSVFdBaWnY/HrW4BPwGsfwxGSqynnlpawT99YmNw4jR5pagRoVDXKXNl+cZVMs6hNgblRey/OMZzUdqPbvvs5sPnDqTOAmzf9IvYfOHkEFRLOsqhA23aL2X5w55Z1nsobbYey4VSZ+6uzft2i9h84JzOJ/Tv22HsOMEEOSScVe1Q3b3D44/HCMs/mwtm7e63txbBIZ/N2Xf29w+OLfOAmfzY+rt7vtxbBBDeOc1YYbu3f+vx/Zg7U/my3q7e7+vxb8sD07msDgjbcH35wvLv5zfddu69r84IIlvwmRzjxG6RZt3b78/73FvLy/GOj+ptHx6lzLKqx6uamfL/MbViAIfuwtEb3+wa4t8jHN/wm07r4jtIuSNvmJza/P+by46g4+ZPSdNXJvMlcsse6b4qWD8jF7sSQqlUD/N9BEYTdB8uq4Vgqc2rZYPJU9CygIpKw0s1OGBtwT3i/2uo4sSMfvHSqozTzz6h1LWZzNW5bU5VKUgjp0SGYRhu2qg7W/Z3JJNyx9gABTzxSZ9n2v/EbUaTbNHpMqoBFTUkKs2xGeFJGkKgi7EsRf7BR8Yz6R6c6gdLNQ1sGR6ySnjkS8tPU05mp5ePSxRm4PPuLHi17cYlaPsLerjbJdwl1SdakghJSMOAQNe4JDOyd2BOHitXTtjZbJVGmrjobP8RcOzsAefGLq6M0XVacr8yzLM86lz3Nq+OCGSpeBIFEUIbYoReL3kkYn5LfAAAivxf5nDkeS9P8zqN/lqPVdHUS9sXbaqyMbD5NgcV66w9Ic8jy2q1vrfqT5msrgY6WmSkbuTt8RwxhwFUfhYAcn35iHS/T7OM2kimNQxgV1cvMTsFjfgk8/wAMW2x+jSvobnTXSoqApaWJSEADAZgQoMANvVGOIrlX29sd2ttRJp1/2ZCkavWGeWdOT5E5ia+o3ir6gpS1VbprMf5MwzTqkUVLFGZljsbBpWBJPFzawxDGZdcuoudl58y1LXV9QW96mQSC35HjG+6l6cx51kC0Mdd26nuq7TOl1sAeAoI+45/DGxdKfAXqTqhlc9cuf0+U5OGtFW1FKzeYccERqGG4D5a4HxyeMbdd5irclVTOXol8l2yS+w3JOcCMx7LTLHLo00ehLpJYaCWHmx+JO/jEP0PWzXOXRq8GYxJKG4BpICLfkUtjfMn8bvWzT2Sw0GXaohpYUYt21yuj5J9ySYuT+J5xMX/RgZqIO3/lCor7t1/1Y/8AzMfKf9GZXQ0ypJ1Iy2MA33PQMv8AtlxR53aK1Tk6Z08KG7EE/mIvqJtrknUgJHklvpGhZf8ApAOrJigiz85TqiAMdyVdEkEiD7o8Ozaf4EfcHE7dKvE1pbrHD+pczpVyrNqhSjZZXlZYqgW5VGsA/wD6SAT9jziD+oPgF1PpzKDPp/VGTaqlguz0cTNBO/B+gEsrH8Cw/DFaKzL67KagQTJLQ11JIyukm6OSKRT7EHkEEfmDhKWi2XVBNGsOP5ePMRJUtVTTwRTrBbcA7e7iLR+JvwkvpvTVZrzQ6SPktLLszTKVYlqINys0Z9zGb2I909+VvsqtUxVDbO3u4UXs9ucdJvBt1WHV/QGY5Jm08U+d08UdNmNNUAMlXFyUmA+bgOjryLgHjeFFJvEz0fk6O9Ws00/DxlpC1eXszH1U8lyoueTtIZLn3KE4TtlymmsmWypHroAIPUc/DB8QfCJtdP8A3ZNSnYkg+7nyMRjURVDSqU3bdovZ7c4J4qhprpu2WHs9sKpppHmUgrYKBycOemd6jcCtrD5xbIYQSRTmq3Lu7e4fv8W+eMBiqPNhvV291/r4t+WCSB2rN4I27lNr4DTv5wPcW3X9+cEEEkANYH3p7j0lucLsDzpfen1Xtu5/sw3iU1gbuqGv9NsHaTzm7uru3X22wQRLXhLpifEhpFlZGPfqG2qbn/N5b8Y6g45feEpBH4j9Iusw3d+o9IHPNNKCMdQcfL/pT/1eT/tj/kuL7YP8sr+r6COcniDDZf4wM9ngl7ciy0jghvUCaSE+2MeoXV+uoIaCTK5YqXNUDxzuI1dJE4INj9JBvx+OMvEPTR5h4vc/RZAd8lKhUDnijhB/2Y83qP00rl0jR5hQ5fUVTTVjxfzeBpNqqnJNhxy1v4Y+puyQ7zsnIQEOru5Zfn2ERgvaelo6rtRKTVJCh62CzM6t34+saFqHqrqbWWcjNc6zGDMKyKERQh4k7cKD2VUA2qPyHPzhJ1T1M0Tjz9ObAbdsKWH+GPOoemmqJg6w6ezecuNoEeXSk3/u43/oj0k1hQ9XNFTVWlc8gpUzuhaWaXKplSNBUISzErYAC9yeMOROqUqZSlB/OJc2+yokgIky9KRgAJYAcCNQTqbqRVMklZTybWBs8K7D+B49jiT4fHJ1ggokhi1Fl8MUQEUSRZbTpHGgFgqgJYAfYYtP+kYyJKHoPRSK0aoc8p13BbEfspv+GOceU5HV55KKHLYJswq5GJSGlhaSRrC5sq3JsAT/AAw0ulHJqpiUVDTQNtQdn6AvHbXLt9VT99JkJSCeAOPcIm+TxtdXZ4LvqSjY7vfyMFv/AK4/JL4w+qMsAL53l7MTyzZfAQf/AIYjpOkes3pxGulM9Y7r8ZVP/s24zbo9rc0yJ/JHP/q9/wBUz/2fTiAmWe1pOmZToB8Up/SHq7dbZntykHzAi1Phn8YGa6h1tlel9aR0EyZpKKelzKliELJMfoV1HpYMbKCACCR7j2+/6RjojHlmX6e6j01MlEa2oOV1rMNvmG7ZeGS1vfbG6kn3AT7Y1jwbeDnW+requm9RahyGu0/pfT9dHmU0+aUzU7VMkTb44o0cBmu6ruNtoUNzewM6fpXeoVBDofSOhVqU/WVXXfreaP3McMcbxpcfG5pWt/qziIlWuko7midRjS4YpGB9tx4PHaawU1LUGtkjQGbSMAn9PDrmKpeB/UcumfEXpmJJQIMzgny+dQ31K0bOv5+tEOJn/Sc6Wid9CagUxpMwqqGRmNiyjtun8Buk/vYgrwZ6fkzrxH6LMTbkomkqpSB7IsT2P8WKj+OLB/pPcypzlPT7KzKqVDS1lUQRchQIlH9pJ/swlVpT+8NOpO+kv8Fb/fSLvKJ/ZcwK64+UUNqqcPMp3xj0gWZrYKinD1G7fGOBwW5wVMKNMpMyqdo4Iw54UaoBMyqbDi2LvFfhS04at370HqU7S3P9mA0/89D70vvvbdz/AGYckSms3GVQ25TttzgMKedDd1b7r7bc4IIydIjWAmSz3HpthbIjWE9317vpt84JBF5wEs++44txgtF5w+t9+72txfBBEs+E1Ih4jtIkSXfzE/pt/wCXlx1CxyQ6R66i6Z9Ucj1N2Xq/IVJaSC1t6MpRwD99rG342x0Jyvxg9Jc1jpyNVLTSy2/Y1NHOjIfsx2bRb73t+OPnb0lWi4Vlwk1NLIUtGjS6QVMQpRyztgiLpY6mTKkqRMWAXfJbgRWTxJaaq9EeJyo1XnNLUx6fr2inhrIYi6MFgSNlv7bgy8qTexB+cb3k3iu6a0elqfLEXNBJDAyP/NBZmNyWvu+ScWl1BrzTOntNHPc1zmhgyQoHWraUPHIDyuy195PwFuT8YjlPFh0bkvt1VTGwuf8Aq+o/5WLB2V9Jt6tdul0tJbFTe7ATqTq/hADFkkAsA+d+m0V68dkLbcqxVVUTtKlAhsbEv16xGWmfGT08y6mKzHNCRdjtpAeP72JPyL9I10wSk7de2dyNFa0y0QJYf+L1+/4/OKoeMXqdpHqdqTIqrSmaJmVNTUMkc7xU7xBGL3A9aqTxivdBSGufy1Kk9RPMVjSKOMs7sTYBQBckni2Nxpe0tdfqOXVVknulqzpILpyRyxz5Rm6ewtptpMiQpSkp5cZ+UXR8ZHi26f8AXbpHBp/TUmZeeizWGrc1dJ20CLHIp53Hm7riKPAhJDTeJfSrlwyAVt//AGkvGInTpdq0U8q/yU1BYkXvlc1/4enEz+DrRueaZ6+6brs0yPNstoY/NB6msoZYo0JpZALsVAFyQPzIwvJlTJs9GpJyRxEqaKRR2+bTSTghXLnIi+fW7xFaG6I/qptSQZjG+ZGXyz0EAbmPZuudwt9a2/jjUNO/pIOjFDTiprVz9qreVRhQKQq/BHr9/wAcQ7+kM01m+rYdCnKMqzDN0hNYZGy2meoCX7FtxQG17G1/sftincXSTWdVCsUOj9RysDu2x5TOzfnYJ7Y5eaVE6bompcI2Udxjr0+94ZWShppUtE93XnBL89I6H9Sf0q+jMvyhxonTuZZvmbjbHLmyrTUyN9yFZna39X03+4xzp6mdQ866sarrdUanzNswzaucvJMwsoHsERfZVUcADGwZL4duomojDDT6OzqnXeR3K6lNKg+92l2jFg+kfhDodM5nl1fq2ohzeuhPdXLohupo+RYuSB3Df4sF4/exnlwv9nsSSVzAqZ/KC6j4eHmWEafQ2mvuqwmWghPU4A/X3Ru3gS6Oy6LydtYZpCYszzeOOGkjdbNHSXDbj9jI202+yqfk4rn40eqtJ1b625hUUdWsuTZRGuV0MiG6yLGxLyAjghpGex+V24mnxR+KKj0/kVbovSld3c2qozDXZjTHcKRDw0aMP+8PIJH0i/7300lqhERHudx6Raw+MI9npFTVzV3etTpUv2R0H/mB1yeYc3pdPTpRQUpcI3PU/e/w4gqUhaZS0u07RxbBUJCZ7tLtNhxbCqRD3VLO4O0cAYdQIvMep3DWHAGL3FUgkSI1lzJZ9y+m2DZF5wHu+vffbb5+2CURecJLuH3LwBxgIi84PW+/f7W4vgghuIfOC4fff78YP2PnDw+/d734vgkaLzqgoxe/vfjBvi84R2237ve/F8EEbl0b01lGruptDlmaQyTUjx1c0kfmewrNHTSyqGksdi7kFzbgXxImZdH9NV3Zqcmo5o6muyieaCnoczSto0q1rIIVVagD1ErLd4zym5TezC0P6R1XU6N1TDm2WpGK2HuxjzEayxsskbRurIwsQVdh/HHvv1jz2plSKlWkymmjhkhipsupI4Iot0kcjuoUcSFoYjvveyAXsLYq9fSXGbWpnUszSgAY1FnBU+BjLpzvhnHL+TMkplFMwOfIeHPxj2YehyO09ZQ6ioa3JqI1MOaZlGsgSjeAKzgIVDSBtwEZX6je+22PvUdG6BOm82p8uzKKqy6hqKqKrzhHcwTfs4GpYUj2h1lYyOGBFltyRYX8n/LnqCqzGOZYqCnhAnepooaKNKateYKJ3njAs7OFUH7bRt24/JN1j1DmInj7sMFM1PU03lYKaNIVgmjjjaIIBbaqwxbR+6yBh6ucJJk3pSkFUwMC5zuM4LJDnofZGDpJGfRVSgFgfv3/APfiI0qn7OyXargbTe5+Mbd0ZaJOqekGjDqRnNEbk/6dbY1GneIxy7Y2HpN7n4xtfSCSJepulGVCoGbUZNz/AKZcXSR/io8x+cRcz2D5R0f6pdWMm6SacjzrO1qno5KhaUCkjEj72ViLgkcWU83+2InfxwdPpIywizoLe3NIvv8A38eb42MygqOklNGD3LZrCSF/1cuK2+Gmpgg6t5K5h3JedQjLvuTA4Fh84v1ZW1MqvRRyiAFaRkdS0QFPSy1yTMWC+Ys4PG5oeBO9TnO4je10plH+G/HsaV/SD6SyTUFNmFVFmj0iRSRM0dIokJZbDjfY2Njz9sRD42sjfJ6DRk9XTxwSVJqz5eMAOgHZtvI+efb4xVtmi8on7Ntu72vziBu1wnK76hUpK0EFJIDbjLF+HwfeIkE2qXInImzpZC0kKY/EPsemPcYv1rPx/wDT9qfuZXkeoc1na4XzIipoyfxIdz/hitHUzxS6p15FLDSn+TmWVClWp8uciV1+zSn1H3527QfkYhuR4fLxExtt3GwvgleLy8V42K2Nhf2xk1F2QstDO/ES5AK+qiT8jh/Fni3zb5cJsvujNIT0GPyzBOIO1HuVyNnFj8YdX2P2e8OfTxY/GFUPF2o7xsfRxY/GHVPEBHujY+kWsfjFyiChVPY7y7le+0ex+MOo7HmBuVy1h7HjBUvEJl3Rsx2j2OCoeIVADRsWsOQcEEEvZ87yH7m5eQeL4D2POj0v3N3vfi+CVovOWMbF9y83wF4vOAdtt++178XwQQ3dBWBeyC1x6r4O4nnCOyL7vqvhvU7awJtT3tcjnC8z/O9mxPqte3OCCEjp5sgQgHefVf8AxwqaRGnsIAp55vjJKm9WU2J9RFwOcKmqu5Pt2IPfkDnBBBTSI0jWgVfSeb4VLIhMloFX0/B98Omqu5Iw2IPSTwMFNVdwv6EFlv6Rgggp3Ro5LQhbKeL++Nj6YTQpr/TjyRmKJczpS7Ibm3dW5GNdp6ruJIdiCyk8D3xs/SiczdRtMAIoP61pLbR95lwrJVomJV0Ij2hIWoJPMWF8VgqH6fwzo1RU5Ya+MBqmAxEtte1j8/PxiMPCW/8A235A0Y7DDzNmXkg+Wk55xcvVHT3Jup8FHk2fQSVND5pZtiSsh3AMPcfgxx8tMeG7Q2gM/ps7yPLaiDMKbf2maqkcDchQ+kmx4Y4t1X3t2rRUlIADBs7D6xaJFmVSVKFyD6qSDnwL9IgPxzSsf5JGXdOL1QG9vb+ixVdnQUiHsi276b+2LUeOauhD6UjiZZXjaqDm11BPa4v8nFWGqrUqvsTlrWtxiuV6paqlfctp2xtgMfn84ZX3vP2hMM139Xf+kN8oxkkQU8J7AILH039sEsiCCImAEEGwv7YclVanibYhuxFiOMEtVtgibYh3A8EcDEfEDCnkQRR3gVvRe1/b8MOqkRRHeENdQeT7fhhT1WyOM7EN0vyMZVNV2xH6EN1B5GCCMamRBMoMCsdo5vh1EiCosYQxsOb4Kmq2SqNiG6g3Iw56rZPt2IeByRzgghSuorNphBbcvqvgMiecA7Ivvtuv/jhyVO2s7exD6lFyOcI1X88CbE+u17c4IIyepcVgjsNtwPbC8y/nNnG3db2w3mmFWFF+3f8Aq/78Hdn83t57e630/H54IISVLmrKWFt5HthU1S8k4Uhbc+wx9KbzVTmCwRo8heTYqqnJvwAMSzrjobm+ns0paHIKWt1FLFQR1GYtDSFlpZipLpdb7gdpYexAIvfD2npF1LlOAG+flD6mpF1TlJYBuvPk8RHTVTySsCFsFJ4GClqXkZ7heFvwMe3lubUlDX1P6xyoShQBsUsFQj3P354/K2PQzTUWR1mXVEFBkZpqsgbKkuxUc82BPP8A+46ul0JKisYJHO490el0mhBUZgwSOdx7o1OCpeRJdwXhCRYYypq2VEeVG2SRgMrLwQfviY/DnprIc2XPcz1RljZ4YIljy7KPUhrJiwuqlSvq5QDm1mY/GJX6waA0PD0ajrss0FJpjWWaZhFl+WZeawzVAkLjkgOylSoYfmV9iRhJdNNRKTOb1T8stno/ELSrdMmyTOCgGBLF3/Js8ZiqcWqc37EkgzGqDKRYiZv+OGNW5yaZ3OZ1d99v6d/+OLYZ3oPploHUOQ9NzpKo1Rq+WnhlrczjqGCq5BMhZdwsAis9gOF2+5vjR4On+kq/qvqZoaAx6W0/TgVMIkYrJUFeVU33ceri/wBSfY48y5apgBSeWhddsnoUEawS7HJwWcvjgbtFfajNquspVeonecqxA7jFrflfHxaqfyqPYXLW9sTd1GyfT+TaNqqltJtkGZvJ2qeHzXee5sQxKsVA9+D9sfm0flendIw5VluptMz6mz7OJU7EEEpjMW4hVQ+oDkn3+4PNhhjcJhtyArQVk8JZ/PLANvDqXY585atc1KQlIJJ1cnSAzO5OwbZzEMyVTiniawuWPxglqnWCJha7A34xYfqpkmhtG9YMuyOh0zNmK+VSKSgpZ2AarkYdsMWbiyEfNvUPsce31Ak6f6dzptG0nTFG1hWwxw0hizBpoYaiZR2i/q+7KxFvYj74iZV1E4IUmUr1hq/h26+1HJtjVJ1656PVUUn2jnp7LOem+Iq7PVOkUZFuUueMOqqXjEdgOVBNxi3FV0K0nnfW7SnT3LqDbl+R5atbqbMoXYS1bbVAQ3JCFjsNltxK1vpGNX6h9T+h9FHnGX6c6ZTTVcQmgo8werkMDsLqkpG8nbezW9yPtjym7iaQmTJUosCQGwCSA7kbs48IZzbWuQT30xKQCRzkhnAYcO3nFbqmqeOZQALFQeRhz1TpPtG21h8YvPpPoPp/TGX6ay1uk56iV08K/rTMxnsdMI5WI/o1aRQygXItYEAckm+Kv+IibTkPVjNKTRunq7S+V0m2lmy2v9UkdQl1l/few3C1tx9ifm2OW29011URTAkB8ungtkAkh+HAMJ1ltnUAHfYOMZ58SGPuJiOJKl1rNgAtuUe2A1LisCWFt1vbBJNMKvaL9vcB9PxgM0/mwvOzd/V+PzxYIiYyfvebFt/bv/DC/b+b/f7e778Ww3jm82CN3bv9+MLtzebLerZu+/FsEEe1onP/AOS2s8vzepoGzOno5zMKZpe2GYA7DusbWaze3xjZK/rhrWt1BmVdR5xW5PT1k7zrTU01hFwAoDcG4VVF+Pa/GNASOYVZY7tm4/PFsFNHOs933befc4cJqJqEaEKYO+IcJqJqEd2hTB3xHu6dz6PLYMzasoJ67MqgDsVb1ICRfVv3IUJcsSpvuW20+98eFTd+779/08X++CmjnWRi+6xU+5+cFLHOhffu5Xi5+cJFalJCScCE1TFKSEk4H1j3sh1lm2QpQtRvJTy0E61cThvV3FNx/vxvM/Xmsr+quWa5qsmaZ8vVJFyyWsLQGYIVLx3W0YJCttAPK3+cRRTxzqkm7dcrYXPzgijnEMobduIG25w4/FzinQTjGGDY2++eYcCsngAatmPHG0WIpvFbl9JqnP8AVkHTekXUmYJ24quXMWkEI7YQ+nZzc3JsVuLLxa5jvIeq5yrR0+TVWSPmD1lcavMJ5Kva1Xc32kbfSLhb882P9bEdpFOKeUHduJFuecCxT+WdfVvLffm2G6FGWXTC67lVLIKldeBzvxzG15jrY1tdlU0OUrS5dl86yJlqyllYBtxBYj5/L5xuNL1woafVFPqJ9GRz1sEQiiVq0gowJ9d9lr82HHGIjEc/lberfuv782wNHMaVQN2/dzzzbDWrkorklNRkENgkY6YbEOZN6rqdRVLWON0pO2AwIIDcNtvvG96f6o1OXdRX1nnGWHO6+WaWby/f7KrI4IBvtbhQSAPy54x+nR3VybTvVIa6zXJ2z6s7k060pqeyqSMCFN9rXCKSALfAPxiOpI52giA3bw3NjglinMEQG/cAb84SNJIL+ruNPPs9PD3Q0FwqUhKQvCVFYwPaLZOM7cvE46E8TU+kMx1fmOY6XTPqrU0vdqW86YO2h3jtD0N6QHsLW9vyt5GfdXtLVWoNL1+XdLsty6jyudp6yiFWZRmHttRyUsAvJtta/F+ODEs8U7RRhd1wnNj84yqY52CbN3C82PzhubZS94ZoSQSGLKUMM2wLYG3TiPSrlVLlplKUCAXDpS7u+7Pk75zE80/iP0/p3VY1FpzpjBlGcojdqVc3keGJiu0WhCKoA+wtx9vfEH55meY53nVXmNXNLU1dXK1RPMx5kkZizMfxJJOPy1Mc7SqV3bdo9j84J45zOCu7bYexx2kttNQqUuQC6mBJUpWA7D1iWAc4GISqK2dVBKZpDB2YJG++wDnxMOTv+b9O/t7l9jxb5wj3/Nj6+3u+/FsEkcxrNw3dvcvzxbAY5/OBvVs3ffi2JOGMf//Z"

class FieldDisplay extends Blockly.Field {
  constructor(opt_value, opt_validator) {
    super(opt_value || defaultImage, opt_validator);

    this.size_ = new Blockly.utils.Size(0, 0);
    this.SERIALIZABLE = true;
    this.CURSOR = 'pointer';
  }

  initView() {
    super.initView();

    this.movableGroup_ = Blockly.utils.dom.createSvgElement('g', {
      'transform': 'translate(5, 5)'
    }, this.fieldGroup_);

    this.preview_ = Blockly.utils.dom.createSvgElement('image', {
      'width': '160',
      'height': '128'
    }, this.movableGroup_);

    this.preview_.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '');
  }

  updateEditable() {
    if (!this.fieldGroup_) {
      return;
    }
    super.updateEditable();

    var group = this.getClickTarget_();
    if (!this.isCurrentlyEditable()) {
      group.style.cursor = 'not-allowed';
    } else {
      group.style.cursor = this.CURSOR;
    }
  }

  getText() {
    return "<Image>";
  }

  doClassValidation_(newValue) {
    if (typeof newValue != 'string') {
      return null;
    }
    return newValue;
  }

  doValueUpdate_(newValue) {
    super.doValueUpdate_(newValue);
    this.displayValue_ = newValue;
    this.isValueInvalid_ = false;
  }

  doValueInvalid_(invalidValue) {
    this.displayValue_ = invalidValue;
    this.isDirty_ = true;
    this.isValueInvalid_ = true;
  }

  render_() {
    var value = this.displayValue_;

    if (this.editor_) {
      // this.renderEditor_();
    }

    this.textElement_.style.display = 'none';
    this.textContent_.nodeValue = value;

    var img = new Image();
    img.onload = () => {
      var imgWidth = img.width;
      var imgHeight = img.height;

      if (!this.borderRect_) {
        this.borderRect_ = Blockly.utils.dom.createSvgElement('rect', {
          'x': 0,
          'y': 0,
          'width': 160 + 10,
          'height': 128 + 10,
          'style': 'fill: black; fill-opacity: 0.9; border-radius: 4px;',
        }, this.fieldGroup_);
      }

      var clipPath = Blockly.utils.dom.createSvgElement('clipPath', {
        'id': 'clipImage' + this.id_
      }, this.fieldGroup_);

      Blockly.utils.dom.createSvgElement('rect', {
        'x': 0,
        'y': 0,
        'width': 160,
        'height': 128
      }, clipPath);

      this.preview_.setAttribute("clip-path", "url(#clipImage" + this.id_ + ")");
      this.preview_.setAttribute("width", imgWidth);
      this.preview_.setAttribute("height", imgHeight);
      this.preview_.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', "data:image/png;base64," + value);
    };

    img.src = "data:image/png;base64," + value;
    this.updateSize_();
  }

  updateSize_() {
    this.borderRect_.setAttribute('style', 'fill: black; fill-opacity: 0.9; border-radius: 0;');
    this.borderRect_.setAttribute('width', 160 + this.constants_.FIELD_BORDER_RECT_X_PADDING * 2);
    this.borderRect_.setAttribute('height', 128 + this.constants_.FIELD_BORDER_RECT_X_PADDING * 2);
    this.size_.width = 160 + this.constants_.FIELD_BORDER_RECT_X_PADDING * 2;
    this.size_.height = 128 + this.constants_.FIELD_BORDER_RECT_X_PADDING * 2;
  }

  showEditor_() {
    var html = `
    <div class="FieldDisplayDropdown">
      <div class="image-preview">
        <canvas class="preview" width="0" height="0"></canvas>
        <div class="size-label"></div>
      </div>
      <div class="control">
        <div>
          <button class="choose-image-btn"><i class="far fa-image"></i> Choose Image</button>
        </div>
        <div style="display: none">
          <div class="label">Size<div class="value size-value">100%</div></div>
          <div class="inp">
            <input type="range" class="size-inp" min="1" max="100" value="100">
          </div>
        </div>
      </div>
    </div>
    `;

    let mainDiv = Blockly.DropDownDiv.getContentDiv();
    mainDiv.innerHTML = html;
    this.editor_ = mainDiv.querySelector(".FieldDisplayDropdown");

    this.editor_.querySelector(".choose-image-btn").addEventListener("click", function (e) {
      let input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png, image/jpeg";
      input.addEventListener("change", function (e) {
        if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];

          if (isElectron) {
            // Electron: เก็บ path ไว้ใช้ fs.readFileSync
            this.fileChoose_ = window.nodeRequire('electron').webUtils.getPathForFile(file);          // <-- Electron เท่านั้นที่มี
            this.selectedFile_ = null;
          } else {
            // Browser: เก็บไฟล์ไว้ แล้วค่อยอ่านผ่าน Object URL/FileReader
            this.selectedFile_ = file;             // <-- เก็บเป็น File object
            this.fileChoose_ = file.name || "";    // เก็บชื่อไว้เผื่อ serialize (ไม่ใช่ path)
          }

          for (let el of this.editor_.querySelectorAll(".control > div")) {
            el.style.display = "block";
          }
          this.updateImagePreview_();
        }
      }.bind(this));
      input.click();
    }.bind(this));

    if (this.fileChoose_ && this.fileChoose_.length > 0) {
      for (let e of this.editor_.querySelectorAll(".control > div")) {
        e.style.display = "block";
      }
    }
    this.editor_.querySelector(".size-value").innerText = `${this.image_resize_}%`;
    this.editor_.querySelector(".size-inp").value = this.image_resize_;

    this.editor_.querySelector(".size-inp").addEventListener("input", function (e) {
      this.image_resize_ = e.target.value;
      this.editor_.querySelector(".size-value").innerText = `${e.target.value}%`;

      this.updateImagePreview_();
    }.bind(this));

    let canvas = this.editor_.querySelector("canvas.preview");
    canvas.width = this.preview_.getAttribute("width");
    canvas.height = this.preview_.getAttribute("height");
    let ctx = canvas.getContext("2d");
    ctx.drawImage(this.preview_, 0, 0, this.preview_.getAttribute("width"), this.preview_.getAttribute("height"));

    this.editor_.querySelector(".size-label").innerText = `${canvas.width}x${canvas.height}`;

    // These allow us to have the editor match the block's colour.
    var fillColour = this.sourceBlock_.getColour();
    Blockly.DropDownDiv.setColour(fillColour, this.sourceBlock_.style.colourTertiary);
    Blockly.DropDownDiv.showPositionedByField(this, this.dropdownDispose_.bind(this));
  }

  updateImagePreview_() {
    const size = Number(this.editor_.querySelector('.size-inp').value) || 100;
    const tmpImage = new Image();
    tmpImage.crossOrigin = 'anonymous';

    tmpImage.onload = () => {
      const maxW = 160, maxH = 128;
      let w = tmpImage.width, h = tmpImage.height, ratio = 1;

      ratio = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * ratio * (size / 100));
      h = Math.round(h * ratio * (size / 100));

      this.editor_.querySelector('.size-label').innerText = `${w}x${h}`;

      const canvas = this.editor_.querySelector('canvas.preview');
      canvas.width = w; canvas.height = h;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(tmpImage, 0, 0, w, h);

      // ถ้าใช้ ObjectURL ให้ revoke หลังโหลดแล้ว
      if (tmpImage.__objectURL) {
        URL.revokeObjectURL(tmpImage.__objectURL);
        tmpImage.__objectURL = null;
      }

      this.updateValue_();
    };

    if (typeof isElectron !== 'undefined' && isElectron) {
      const contents = nodeFS.readFileSync(this.fileChoose_, { encoding: 'base64' });
      tmpImage.src = 'data:image/png;base64,' + contents;
    } else {
      if (this.selectedFile_ instanceof File) {
        const url = URL.createObjectURL(this.selectedFile_);
        tmpImage.__objectURL = url;
        tmpImage.src = url;
      } else if (this.fileChoose_) {
        // อาจเป็น dataURL เดิมจาก XML (หากคุณ serialize ไว้)
        tmpImage.src = this.fileChoose_;
      } else {
        tmpImage.src = 'data:image/png;base64,' + (this.getValue() || defaultImage);
      }
    }
  }

  updateValue_() {
    let canvas = this.editor_.querySelector("canvas.preview");
    let base64 = canvas.toDataURL("image/jpeg", 0.9).split(',')[1];
    this.setValue(base64);
    // console.log(base64);
  }

  toXml(fieldElement) {
    fieldElement.textContent = this.value_;
    fieldElement.setAttribute("file", this.fileChoose_ || "");
    fieldElement.setAttribute("resize", this.image_resize_ || 100);
    fieldElement.setAttribute("ImagePositionX", this.image_position_x_ || 0);

    return fieldElement;
  }

  fromXml(fieldElement) {
    this.fileChoose_ = fieldElement.getAttribute("file") || "";
    this.image_resize_ = fieldElement.getAttribute("resize") || 100;
    this.image_position_x_ = fieldElement.getAttribute("ImagePositionX") || 0;
    this.setValue(fieldElement.textContent);
  }

  applyColour() {
    if (!this.sourceBlock_) {
      return;
    }
  }

  dropdownDispose_() {
    delete this.editor_;
  }
}

FieldDisplay.fromJson = function (options) {
  return new this(options['value']);
};

Blockly.fieldRegistry.register('field_display', FieldDisplay);

setInterval(function () {
  var workspace = Blockly.getMainWorkspace();
  var allBlocks = workspace.getAllBlocks();
  var displayDrawBlocks = allBlocks.filter(function (block) {
    return block.type === 'display_draw_image';
  });

  displayDrawBlocks.forEach((block) => {
    var xValue = block.getInputTargetBlock('x');
    var yValue = block.getInputTargetBlock('y');
    const imageField = block.getField('image');

    imageField.preview_.setAttribute("x", xValue);
    imageField.preview_.setAttribute("y", yValue);
  });

}, 100);