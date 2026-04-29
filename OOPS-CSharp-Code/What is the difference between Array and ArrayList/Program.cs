using System;
using System.Collections;

//Q. What is the difference between Array and ArrayList (atleast 2)?

namespace What_is_the_difference_between_Array_and_ArrayList
{
    class Program
    {
        static void Main(string[] args)
        {
            int[] array;

            array = new int[10];

            array[0] = 1;

            //array[1] = "Happy";

            ArrayList arrayList;
            arrayList = new ArrayList();

            arrayList.Add(1);
            arrayList.Add("Happy");

        }
    }
}
